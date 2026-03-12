#!/usr/bin/env bash
set -euo pipefail

# ── Config ──
DONE_DIR=".task-state"
LOG_FILE="task-runner.log"
OUTPUT_DIR="task-outputs"

# Pacing — tune these to stay under usage limits
BASE_DELAY=60                 # seconds between tasks (minimum)
RAMP_DELAY=30                # extra seconds added per completed task (cumulative fatigue)
MAX_DELAY=600                # cap delay at 10 minutes
RATE_LIMIT_WAIT=300          # 5 min initial wait on rate limit (doubles each retry)
MAX_RATE_LIMIT_RETRIES=6     # retries before giving up on a task
SESSION_PAUSE_EVERY=5        # after N tasks, take a longer break
SESSION_PAUSE_DURATION=900   # 15 min session break
PHASE_PAUSE_DURATION=120     # 2 min pause between phases

# ── Collect task files ──
if [[ $# -gt 0 ]]; then
  TASK_FILES=("$@")
else
  TASK_FILES=("tasks.txt")
fi

# ── Setup ──
mkdir -p "$DONE_DIR" "$OUTPUT_DIR"
touch "$LOG_FILE"

# Migrate old .tasks-done if it exists (backward compat)
if [[ -f ".tasks-done" && ! -f "$DONE_DIR/tasks.done" ]]; then
  cp ".tasks-done" "$DONE_DIR/tasks.done"
fi

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
  echo "$msg" | tee -a "$LOG_FILE"
}

fmt_duration() {
  local secs=$1
  if [[ $secs -ge 3600 ]]; then
    printf "%dh%02dm" $((secs / 3600)) $(((secs % 3600) / 60))
  elif [[ $secs -ge 60 ]]; then
    printf "%dm%02ds" $((secs / 60)) $((secs % 60))
  else
    printf "%ds" "$secs"
  fi
}

done_file_for() {
  local tasks_file="$1"
  local base
  base=$(basename "$tasks_file" .txt)
  echo "$DONE_DIR/${base}.done"
}

output_dir_for() {
  local tasks_file="$1"
  local base
  base=$(basename "$tasks_file" .txt)
  echo "$OUTPUT_DIR/${base}"
}

count_tasks() {
  local file="$1"
  local count=0
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" || "$line" =~ ^# ]] && continue
    count=$((count + 1))
  done < "$file"
  echo "$count"
}

count_done() {
  local done_file="$1"
  if [[ -f "$done_file" ]]; then
    grep -c -v '^\s*$' "$done_file" 2>/dev/null || echo 0
  else
    echo 0
  fi
}

is_phase_complete() {
  local tasks_file="$1"
  local done_file
  done_file=$(done_file_for "$tasks_file")
  local total
  total=$(count_tasks "$tasks_file")
  local done
  done=$(count_done "$done_file")
  [[ "$done" -ge "$total" ]]
}

# ── Grand totals ──
grand_total=0
grand_done=0
for tf in "${TASK_FILES[@]}"; do
  if [[ ! -f "$tf" ]]; then
    log "ERROR: Task file not found: $tf"
    exit 1
  fi
  t=$(count_tasks "$tf")
  d=$(count_done "$(done_file_for "$tf")")
  grand_total=$((grand_total + t))
  grand_done=$((grand_done + d))
done

num_phases=${#TASK_FILES[@]}
log "=== Multi-Phase Task Runner Starting ==="
log "Phases: $num_phases | Total tasks: $grand_total ($grand_done already done)"
for i in "${!TASK_FILES[@]}"; do
  tf="${TASK_FILES[$i]}"
  t=$(count_tasks "$tf")
  d=$(count_done "$(done_file_for "$tf")")
  status="pending"
  if [[ "$d" -ge "$t" ]]; then status="COMPLETE"; elif [[ "$d" -gt 0 ]]; then status="in-progress ($d/$t)"; fi
  log "  Phase $((i + 1)): $tf ($t tasks) — $status"
done
log "Pacing: ${BASE_DELAY}s base + ${RAMP_DELAY}s/task ramp, ${SESSION_PAUSE_DURATION}s break every ${SESSION_PAUSE_EVERY} tasks"
log ""

# ── Phase loop ──
global_start=$(date +%s)
completed_all_sessions=0

for phase_idx in "${!TASK_FILES[@]}"; do
  TASKS_FILE="${TASK_FILES[$phase_idx]}"
  DONE_FILE=$(done_file_for "$TASKS_FILE")
  PHASE_OUTPUT_DIR=$(output_dir_for "$TASKS_FILE")
  phase_num=$((phase_idx + 1))
  phase_name=$(basename "$TASKS_FILE" .txt)

  touch "$DONE_FILE"
  mkdir -p "$PHASE_OUTPUT_DIR"

  # Count tasks for this phase
  total=$(count_tasks "$TASKS_FILE")
  done_count=$(count_done "$DONE_FILE")

  # Skip completed phases
  if [[ "$done_count" -ge "$total" ]]; then
    log "═══ Phase $phase_num/$num_phases ($phase_name): ALL $total TASKS COMPLETE — skipping ═══"
    log ""
    continue
  fi

  log "═══════════════════════════════════════════════════════════════"
  log "═══ Phase $phase_num/$num_phases: $phase_name ($total tasks, $done_count done) ═══"
  log "═══════════════════════════════════════════════════════════════"
  log ""

  # ── Task loop for this phase ──
  task_num=0
  completed_this_phase=0
  phase_start=$(date +%s)

  while IFS= read -r task || [[ -n "$task" ]]; do
    # Skip empty lines and comments
    [[ -z "$task" || "$task" =~ ^# ]] && continue
    task_num=$((task_num + 1))

    # Skip if already done (exact match)
    if grep -qFx "$task" "$DONE_FILE" 2>/dev/null; then
      log "[$phase_name $task_num/$total] SKIP (done): ${task:0:80}..."
      continue
    fi

    # Session break — longer pause after every N tasks
    completed_combined=$((completed_all_sessions + completed_this_phase))
    if [[ $completed_combined -gt 0 && $((completed_combined % SESSION_PAUSE_EVERY)) -eq 0 ]]; then
      log ""
      log ">>> Session break after $completed_combined tasks total. Pausing $(fmt_duration $SESSION_PAUSE_DURATION)..."
      log ""
      sleep "$SESSION_PAUSE_DURATION"
    fi

    log "[$phase_name $task_num/$total] STARTING: ${task:0:80}..."
    task_start=$(date +%s)

    retries=0
    success=false
    task_output_file="$PHASE_OUTPUT_DIR/task-$(printf '%02d' "$task_num").log"

    while [[ $retries -lt $MAX_RATE_LIMIT_RETRIES ]]; do
      # Run claude in print mode, capture output and exit code
      set +e
      output=$(claude -p \
        --verbose \
        --permission-mode auto \
        "$task" 2>&1)
      exit_code=$?
      set -e

      # Save full output to per-task file (append on retries)
      {
        echo "=== Attempt $((retries + 1)) at $(date '+%Y-%m-%d %H:%M:%S') (exit: $exit_code) ==="
        echo "$output"
        echo ""
      } >> "$task_output_file"

      # Check for rate limit / usage limit signals
      if echo "$output" | grep -qi "rate.limit\|too many requests\|429\|usage limit\|over capacity\|exceeded.*limit\|capacity.*reached"; then
        retries=$((retries + 1))
        # Exponential backoff: 5min, 10min, 20min, 40min...
        wait_time=$((RATE_LIMIT_WAIT * (2 ** (retries - 1))))
        log "  RATE LIMITED (attempt $retries/$MAX_RATE_LIMIT_RETRIES). Waiting $(fmt_duration $wait_time)..."
        sleep "$wait_time"
        continue
      fi

      if [[ $exit_code -eq 0 ]]; then
        success=true
        break
      else
        log "  Non-zero exit ($exit_code). Output tail:"
        echo "$output" | tail -10 >> "$LOG_FILE"
        # Non-rate-limit failure — don't retry endlessly
        break
      fi
    done

    task_end=$(date +%s)
    task_duration=$((task_end - task_start))

    if $success; then
      completed_this_phase=$((completed_this_phase + 1))
      remaining=$((total - task_num))
      log "[$phase_name $task_num/$total] DONE in $(fmt_duration $task_duration) ($remaining remaining) → $task_output_file"
      echo "$task" >> "$DONE_FILE"
    else
      log "[$phase_name $task_num/$total] FAILED after $retries retries ($(fmt_duration $task_duration)) → $task_output_file"
      log "  Stopping to avoid partial work on next task."
      log ""
      log "=== Runner stopped during phase $phase_num ($phase_name). ==="
      log "=== $completed_this_phase tasks completed this phase, $((completed_all_sessions + completed_this_phase)) total. ==="
      log "=== Re-run to resume from where you left off. ==="
      exit 1
    fi

    # Adaptive pacing — delay increases with each completed task
    remaining=$((total - task_num))
    if [[ $remaining -gt 0 ]]; then
      delay=$((BASE_DELAY + (RAMP_DELAY * completed_this_phase)))
      [[ $delay -gt $MAX_DELAY ]] && delay=$MAX_DELAY
      log "  Pacing: waiting $(fmt_duration $delay) before next task..."
      sleep "$delay"
    fi

  done < "$TASKS_FILE"

  phase_duration=$(( $(date +%s) - phase_start ))
  completed_all_sessions=$((completed_all_sessions + completed_this_phase))

  log ""
  log "═══ Phase $phase_num/$num_phases ($phase_name) COMPLETE! $total tasks in $(fmt_duration $phase_duration) ═══"
  log ""

  # Pause between phases (unless this was the last one)
  if [[ $phase_idx -lt $((num_phases - 1)) ]]; then
    log ">>> Phase transition pause: $(fmt_duration $PHASE_PAUSE_DURATION) before next phase..."
    log ""
    sleep "$PHASE_PAUSE_DURATION"
  fi

done

total_duration=$(( $(date +%s) - global_start ))
log ""
log "══════════════════════════════════════════════════════════════════"
log "=== ALL $num_phases PHASES COMPLETE! $grand_total tasks in $(fmt_duration $total_duration) ==="
log "══════════════════════════════════════════════════════════════════"
