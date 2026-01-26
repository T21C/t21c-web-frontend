/**
 * Script to analyze duplicate translation patterns
 * Run with: node client/src/translations/analyzeDuplicates.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const translationsDir = path.join(__dirname, 'languages', 'en');
const commonFile = path.join(translationsDir, 'common', 'main.json');

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
        const isEmpty = Object.keys(obj[key]).length === 0;
        if (isEmpty) {
          result[`${newKey}__EMPTY__`] = '{}';
        } else {
          flattenObject(obj[key], newKey, result);
        }
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
  const commonContent = JSON.parse(fs.readFileSync(commonFile, 'utf8'));
  const commonFlat = flattenObject(commonContent);
  
  // First pass: collect all values
  files.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const json = JSON.parse(content);
      fileContents.set(filePath, json);
      
      const flat = flattenObject(json);
      Object.entries(flat).forEach(([key, value]) => {
        if (typeof value === 'string' && value.trim() && value.length > 2) {
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
  
  // Find values that appear in multiple files and are NOT in common
  const duplicates = new Map();
  valueMap.forEach((locations, value) => {
    if (locations.length > 1) {
      // Check if it's already in common
      const isInCommon = Object.values(commonFlat).includes(value);
      
      // Group by file
      const fileGroups = new Map();
      locations.forEach(loc => {
        if (!fileGroups.has(loc.file)) {
          fileGroups.set(loc.file, []);
        }
        fileGroups.get(loc.file).push(loc.key);
      });
      
      // Only consider duplicates if they appear in different files and not in common
      if (fileGroups.size > 1 && !isInCommon) {
        duplicates.set(value, { fileGroups, isInCommon });
      }
    }
  });
  
  // Sort by frequency (most common first)
  const sortedDuplicates = Array.from(duplicates.entries())
    .sort((a, b) => {
      const aCount = Array.from(a[1].fileGroups.values()).reduce((sum, arr) => sum + arr.length, 0);
      const bCount = Array.from(b[1].fileGroups.values()).reduce((sum, arr) => sum + arr.length, 0);
      return bCount - aCount;
    });
  
  return { sortedDuplicates, fileContents };
}

// Find common key patterns
function findKeyPatterns(fileContents) {
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
        fullKey: key,
        value: flat[key]
      });
    });
  });
  
  return keyPatterns;
}

// Main execution
console.log('=== Analyzing Translation Duplicates ===\n');

const { sortedDuplicates, fileContents } = findDuplicates();
const keyPatterns = findKeyPatterns(fileContents);

console.log(`Found ${sortedDuplicates.length} duplicate values across files\n`);

// Show top 30 most common duplicates
const topDuplicates = sortedDuplicates.slice(0, 30);

console.log('=== Top 30 Most Common Duplicate Values ===\n');
topDuplicates.forEach(([value, { fileGroups }], index) => {
  const totalOccurrences = Array.from(fileGroups.values()).reduce((sum, arr) => sum + arr.length, 0);
  const fileCount = fileGroups.size;
  
  console.log(`${index + 1}. "${value}" (${totalOccurrences} occurrences in ${fileCount} files)`);
  
  fileGroups.forEach((keys, file) => {
    const relativePath = path.relative(translationsDir, file);
    console.log(`   ${relativePath}:`);
    keys.slice(0, 3).forEach(key => {
      console.log(`     - ${key}`);
    });
    if (keys.length > 3) {
      console.log(`     ... and ${keys.length - 3} more`);
    }
  });
  console.log('');
});

// Show common key patterns
console.log('\n=== Common Key Patterns (appearing 5+ times) ===\n');
const sortedPatterns = Array.from(keyPatterns.entries())
  .filter(([pattern, locations]) => locations.length >= 5)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 20);

sortedPatterns.forEach(([pattern, locations], index) => {
  const fileSet = new Set(locations.map(l => l.file));
  const valueSet = new Set(locations.map(l => l.value));
  
  console.log(`${index + 1}. "${pattern}" appears ${locations.length} times in ${fileSet.size} files`);
  if (valueSet.size === 1) {
    console.log(`   All have same value: "${Array.from(valueSet)[0]}"`);
  } else {
    console.log(`   Has ${valueSet.size} different values`);
  }
});
