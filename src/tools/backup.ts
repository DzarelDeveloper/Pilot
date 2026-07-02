import fs from "fs";
import path from "path";

export function backupFile(projectRoot: string, relativePath: string): void {
  const originalPath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(originalPath)) return;
  
  const backupDir = path.join(projectRoot, ".pilot-backup", path.dirname(relativePath));
  fs.mkdirSync(backupDir, { recursive: true });
  
  const backupPath = path.join(backupDir, path.basename(relativePath));
  fs.copyFileSync(originalPath, backupPath);
}

export function restoreBackup(projectRoot: string): void {
  const backupRoot = path.join(projectRoot, ".pilot-backup");
  if (!fs.existsSync(backupRoot)) return;
  
  const files = fs.readdirSync(backupRoot, { recursive: true }) as string[];
  for (const file of files) {
    const backupPath = path.join(backupRoot, file);
    if (fs.statSync(backupPath).isFile()) {
      const originalPath = path.join(projectRoot, file);
      fs.mkdirSync(path.dirname(originalPath), { recursive: true });
      fs.copyFileSync(backupPath, originalPath);
    }
  }
}
