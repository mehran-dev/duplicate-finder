import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import inquirer from "inquirer";
import { selectDirectory } from "./selectdir.js";

// Function to generate a hash for a file
async function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);

    stream.on("data", (data) => hash.update(data));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", (error) => reject(error));
  });
}

// Recursively scan directory for files
async function getFilesInDirectory(dirPath) {
  let files = [];
  const items = await fs.readdir(dirPath, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);
    if (item.isDirectory()) {
      files = files.concat(await getFilesInDirectory(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

// Find and handle duplicate files
async function findDuplicates(dirPath) {
  const files = await getFilesInDirectory(dirPath);
  const fileHashes = {};

  // Calculate hash for each file and categorize by hash
  for (const file of files) {
    try {
      const hash = await hashFile(file);

      if (fileHashes[hash]) {
        fileHashes[hash].push(file);
      } else {
        fileHashes[hash] = [file];
      }
    } catch (error) {
      console.error(`Failed to hash file ${file}: ${error}`);
    }
  }

  // Identify duplicates
  const duplicates = Object.values(fileHashes).filter(
    (files) => files.length > 1
  );

  // Display duplicates or move them if needed
  if (duplicates.length > 0) {
    console.log("Duplicate files found:");
    duplicates.forEach((files, index) => {
      console.log(`\nGroup ${index + 1}:`);
      files.forEach((file) => console.log(` - ${file}`));
    });

    // Optionally move duplicates to a separate folder
    const duplicateDir = path.join(dirPath, "duplicates");
    await fs.ensureDir(duplicateDir);

    for (const files of duplicates) {
      for (let i = 1; i < files.length; i++) {
        const duplicateFile = files[i];
        const newLocation = path.join(
          duplicateDir,
          path.basename(duplicateFile)
        );
        await fs.move(duplicateFile, newLocation, { overwrite: true });
        console.log(`Moved ${duplicateFile} to ${newLocation}`);
      }
    }
  } else {
    console.log("No duplicate files found.");
  }
}

// Main function to handle user input and start the duplicate search
async function main() {
  console.log(Object.keys(inquirer));
  const { start } = await inquirer.prompt([
    {
      type: "confirm",
      name: "start",
      message: "Press 'Enter' to start the duplicate file search.",
      default: true,
    },
  ]);

  if (start) {
    // const { folderPath } = await inquirer.prompt([
    //   {
    //     type: "input",
    //     name: "folderPath",
    //     message: "Please enter the folder path to scan for duplicates:",
    //     validate: (input) =>
    //       fs.existsSync(input) ? true : "Folder path does not exist.",
    //   },
    // ]);

    const folderPath = await selectDirectory();

    if (!fs.existsSync(folderPath)) {
      console.log("Folder path does not exist.");
      return;
    }
    await findDuplicates(path.resolve(folderPath));
    console.log("Duplicate search complete.");
  }
}

main().catch((error) => console.error(`Error: ${error}`));
