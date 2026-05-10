export interface PlaneProjectResult {
  projectId: string;
  projectUrl: string;
}

export interface DriveFolderResult {
  folderId: string;
  folderUrl: string;
  subfolders: {
    proposal: string;
    contract: string;
    audit: string;
    implementation: string;
  };
}

export interface IntegrationStatus {
  plane: {
    connected: boolean;
    projectId: string | null;
    projectUrl: string | null;
  };
  drive: {
    connected: boolean;
    folderId: string | null;
    folderUrl: string | null;
  };
}
