/**
 * Script to find duplicate translation patterns across all translation files
 * Run with: node client/src/translations/findDuplicates.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const translationsDir = path.join(__dirname, 'languages', 'en');

// Common patterns to look for
const COMMON_PATTERNS = [
  'cancel',
  'save',
  'edit',
  'delete',
  'close',
  'submit',
  'confirm',
  'loading',
  'error',
  'errors',
  'success',
  'failed',
  'required',
  'placeholder',
  'title',
  'description',
  'label',
  'name',
  'message',
  'messages'
];

// Recursively get all JSON files
function getAllJsonFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllJsonFiles(filePath, fileList);
    } else if (file.endsWith('.json')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Flatten nested object with dot notation
function flattenObject(obj, prefix = '', result = {}) {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        flattenObject(obj[key], newKey, result);
      } else {
        result[newKey] = obj[key];
      }
    }
  }
  return result;
}

// Find all duplicate values across files
function findDuplicates() {
  const files = getAllJsonFiles(translationsDir);
  const valueMap = new Map(); // value -> [{ file, key }]
  const fileContents = new Map(); // file -> parsed content
  
  // First pass: collect all values
  files.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const json = JSON.parse(content);
      fileContents.set(filePath, json);
      
      const flat = flattenObject(json);
      Object.entries(flat).forEach(([key, value]) => {
        if (typeof value === 'string' && value.trim()) {
          if (!valueMap.has(value)) {
            valueMap.set(value, []);
          }
          valueMap.get(value).push({ file: filePath, key });
        }
      });
    } catch (error) {
      console.error(`Error reading ${filePath}:`, error.message);
    }
  });
  
  // Find values that appear in multiple files
  const duplicates = new Map();
  valueMap.forEach((locations, value) => {
    if (locations.length > 1) {
      // Group by file
      const fileGroups = new Map();
      locations.forEach(loc => {
        if (!fileGroups.has(loc.file)) {
          fileGroups.set(loc.file, []);
        }
        fileGroups.get(loc.file).push(loc.key);
      });
      
      // Only consider duplicates if they appear in different files
      if (fileGroups.size > 1) {
        duplicates.set(value, fileGroups);
      }
    }
  });
  
  // Sort by frequency (most common first)
  const sortedDuplicates = Array.from(duplicates.entries())
    .sort((a, b) => {
      const aCount = Array.from(a[1].values()).reduce((sum, arr) => sum + arr.length, 0);
      const bCount = Array.from(b[1].values()).reduce((sum, arr) => sum + arr.length, 0);
      return bCount - aCount;
    });
  
  return { sortedDuplicates, fileContents };
}

// Main execution
const { sortedDuplicates, fileContents } = findDuplicates();

console.log('=== Most Common Duplicate Values ===\n');
console.log(`Found ${sortedDuplicates.length} duplicate values across files\n`);

// Show top 50 most common duplicates
const topDuplicates = sortedDuplicates.slice(0, 50);

topDuplicates.forEach(([value, fileGroups], index) => {
  const totalOccurrences = Array.from(fileGroups.values()).reduce((sum, arr) => sum + arr.length, 0);
  const fileCount = fileGroups.size;
  
  // Skip if it's a very short value (likely not meaningful)
  if (value.length < 3) return;
  
  // Skip if it's already in common/main.json
  const commonFile = path.join(translationsDir, 'common', 'main.json');
  let isInCommon = false;
  if (fileContents.has(commonFile)) {
    const flat = flattenObject(fileContents.get(commonFile));
    isInCommon = Object.values(flat).includes(value);
  }
  
  if (isInCommon) {
    console.log(`\n${index + 1}. "${value}" (${totalOccurrences} occurrences in ${fileCount} files) - ALREADY IN COMMON`);
  } else {
    console.log(`\n${index + 1}. "${value}" (${totalOccurrences} occurrences in ${fileCount} files)`);
  }
  
  fileGroups.forEach((keys, file) => {
    const relativePath = path.relative(translationsDir, file);
    console.log(`   ${relativePath}:`);
    keys.forEach(key => {
      console.log(`     - ${key}`);
    });
  });
});

// Find patterns in keys
console.log('\n\n=== Common Key Patterns ===\n');
const keyPatterns = new Map();

fileContents.forEach((content, filePath) => {
  const flat = flattenObject(content);
  Object.keys(flat).forEach(key => {
    // Extract pattern (last part of key)
    const parts = key.split('.');
    const pattern = parts[parts.length - 1];
    
    if (!keyPatterns.has(pattern)) {
      keyPatterns.set(pattern, []);
    }
    keyPatterns.get(pattern).push({
      file: path.relative(translationsDir, filePath),
      fullKey: key
    });
  });
});

// Show most common key patterns
const sortedPatterns = Array.from(keyPatterns.entries())
  .filter(([pattern, locations]) => locations.length > 3) // Only show if appears in multiple places
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 30);

sortedPatterns.forEach(([pattern, locations], index) => {
  const fileSet = new Set(locations.map(l => l.file));
  console.log(`${index + 1}. "${pattern}" appears ${locations.length} times in ${fileSet.size} files`);
});
