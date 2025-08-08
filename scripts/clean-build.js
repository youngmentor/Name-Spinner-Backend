const fs = require("fs");
const path = require("path");

/**
 * Clean Build Script for Name Spinner Backend
 * Removes all JavaScript files generated from TypeScript compilation
 */

console.log("🧹 Starting cleanup of generated JavaScript files...");

// Function to check if a file exists
function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch (err) {
    return false;
  }
}

// Function to recursively find and remove JS files
function cleanDirectory(dirPath, rootCall = false) {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  if (rootCall) {
    console.log(`📂 Cleaning directory: ${dirPath}`);
  }

  const items = fs.readdirSync(dirPath);
  let removedCount = 0;

  items.forEach((item) => {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip node_modules, .git, and other common directories
      if (!["node_modules", ".git", ".vscode", "exports"].includes(item)) {
        const subCount = cleanDirectory(fullPath);
        removedCount += subCount;
      }
    } else if (stat.isFile()) {
      const ext = path.extname(item);
      const baseName = path.basename(item, ext);

      if (ext === ".js") {
        // Check if corresponding .ts file exists
        const tsFile = path.join(dirPath, baseName + ".ts");

        if (fileExists(tsFile)) {
          console.log(`🗑️  Removing: ${fullPath}`);
          fs.unlinkSync(fullPath);
          removedCount++;
        } else {
          console.log(`⚠️  Skipping: ${fullPath} (no corresponding .ts file)`);
        }
      } else if (ext === ".map" && item.endsWith(".js.map")) {
        // Remove .js.map files
        console.log(`🗑️  Removing map file: ${fullPath}`);
        fs.unlinkSync(fullPath);
        removedCount++;
      }
    }
  });

  return removedCount;
}

// Function to remove directory if it exists
function removeDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    console.log(`🗑️  Removing directory: ${dirPath}`);
    fs.rmSync(dirPath, { recursive: true, force: true });
    return true;
  }
  return false;
}

let totalRemoved = 0;

try {
  // Remove root level server.js if server.ts exists
  if (fileExists("server.ts") && fileExists("server.js")) {
    console.log("🗑️  Removing root server.js");
    fs.unlinkSync("server.js");
    totalRemoved++;
  }

  // Remove server.js.map if it exists
  if (fileExists("server.js.map")) {
    console.log("🗑️  Removing server.js.map");
    fs.unlinkSync("server.js.map");
    totalRemoved++;
  }

  // Clean src directory
  if (fs.existsSync("src")) {
    totalRemoved += cleanDirectory("src", true);
  }

  // Remove common build directories
  const buildDirs = ["dist", "build", "out"];
  buildDirs.forEach((dir) => {
    if (removeDirectory(dir)) {
      totalRemoved++;
    }
  });

  console.log(
    `✅ Cleanup completed! Removed ${totalRemoved} files/directories.`
  );

  // Show remaining JS files (excluding node_modules)
  console.log("\n📊 Remaining .js files (should only be config files):");

  function findJSFiles(dir, results = []) {
    if (!fs.existsSync(dir)) return results;

    const items = fs.readdirSync(dir);
    items.forEach((item) => {
      if (item === "node_modules" || item === ".git") return;

      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        findJSFiles(fullPath, results);
      } else if (item.endsWith(".js")) {
        results.push(fullPath);
      }
    });

    return results;
  }

  const remainingJS = findJSFiles(".");
  if (remainingJS.length === 0) {
    console.log("   No .js files found ✨");
  } else {
    remainingJS.slice(0, 10).forEach((file) => {
      console.log(`   ${file}`);
    });
    if (remainingJS.length > 10) {
      console.log(`   ... and ${remainingJS.length - 10} more`);
    }
  }

  console.log("\n💡 To rebuild the project, run: npm run build");
} catch (error) {
  console.error("❌ Error during cleanup:", error.message);
  process.exit(1);
}
