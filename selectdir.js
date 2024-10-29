import dialog from "node-file-dialog";
import path from "path";

export async function selectDirectory() {
  const config = { type: "directory" };

  try {
    const dirs = await dialog(config);

    console.log("Selected Folder:", dirs);

    return dirs[0];
  } catch (error) {
    console.error("No directory selected or error:", error);
  }
}
/* 

usage : 
    const dir = await selectDirectory();
    
 */
