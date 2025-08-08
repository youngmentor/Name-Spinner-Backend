#!/bin/bash

# Clean Build Script for Name Spinner Backend
# This script removes all JavaScript files generated from TypeScript compilation

echo "🧹 Starting cleanup of generated JavaScript files..."

# Function to safely remove files
remove_js_files() {
    local dir="$1"
    if [ -d "$dir" ]; then
        echo "📂 Cleaning directory: $dir"
        find "$dir" -name "*.js" -type f | while read -r file; do
            # Check if corresponding .ts file exists
            ts_file="${file%.js}.ts"
            if [ -f "$ts_file" ]; then
                echo "🗑️  Removing: $file"
                rm "$file"
            else
                echo "⚠️  Skipping: $file (no corresponding .ts file found)"
            fi
        done
        
        # Also remove .js.map files
        find "$dir" -name "*.js.map" -type f | while read -r file; do
            echo "🗑️  Removing map file: $file"
            rm "$file"
        done
    fi
}

# Remove root level server.js (if server.ts exists)
if [ -f "server.ts" ] && [ -f "server.js" ]; then
    echo "🗑️  Removing root server.js"
    rm server.js
fi

# Remove server.js.map if it exists
if [ -f "server.js.map" ]; then
    echo "🗑️  Removing server.js.map"
    rm server.js.map
fi

# Clean src directory and subdirectories
if [ -d "src" ]; then
    echo "📂 Cleaning src directory..."
    
    # Clean all subdirectories
    for subdir in src/*/; do
        if [ -d "$subdir" ]; then
            remove_js_files "$subdir"
        fi
    done
    
    # Clean root src directory
    remove_js_files "src"
fi

# Remove dist directory if it exists (common TypeScript output directory)
if [ -d "dist" ]; then
    echo "🗑️  Removing dist directory"
    rm -rf dist
fi

# Remove build directory if it exists
if [ -d "build" ]; then
    echo "🗑️  Removing build directory"
    rm -rf build
fi

echo "✅ Cleanup completed!"
echo ""
echo "📊 Remaining .js files (should only be config files or dependencies):"
find . -name "*.js" -not -path "./node_modules/*" -not -path "./.git/*" | head -10

echo ""
echo "💡 To rebuild the project, run: npm run build"
