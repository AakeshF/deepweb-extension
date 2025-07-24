const fs = require('fs').promises;
const path = require('path');

/**
 * Bundle Analysis Script
 * Analyzes the current build output to identify optimization opportunities
 */

async function getAllFiles(dir, baseDir = '') {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(baseDir, entry.name);
    
    if (entry.isDirectory()) {
      const subFiles = await getAllFiles(fullPath, relativePath);
      files.push(...subFiles);
    } else if (entry.isFile()) {
      files.push({ fullPath, relativePath });
    }
  }
  
  return files;
}

async function analyzeBundle() {
  console.log('🔍 Analyzing bundle sizes...\n');

  const distDir = path.resolve(__dirname, '..', 'dist');
  
  try {
    // Check if dist directory exists
    await fs.access(distDir);
  } catch {
    console.error('❌ Error: dist directory not found. Please run build first.');
    process.exit(1);
  }

  const allFiles = await getAllFiles(distDir);
  const stats = [];
  let totalSize = 0;

  // Analyze each file
  for (const { fullPath, relativePath } of allFiles) {
    const stat = await fs.stat(fullPath);
    const ext = path.extname(relativePath);
    const size = stat.size;
    totalSize += size;
    
    stats.push({
      name: relativePath,
      path: fullPath,
      size: size,
      sizeKB: (size / 1024).toFixed(2),
      sizeMB: (size / 1024 / 1024).toFixed(2),
      extension: ext,
      type: getFileType(ext)
    });
  }

  // Sort by size
  stats.sort((a, b) => b.size - a.size);

  // Display results
  console.log('📊 Bundle Analysis Results\n');
  console.log('File'.padEnd(40) + 'Size'.padEnd(12) + 'Type');
  console.log('-'.repeat(60));

  for (const file of stats) {
    const name = file.name.padEnd(40);
    const size = `${file.sizeKB} KB`.padEnd(12);
    console.log(`${name}${size}${file.type}`);
  }

  console.log('-'.repeat(60));
  console.log(`Total: ${stats.length} files, ${(totalSize / 1024).toFixed(2)} KB\n`);

  // Analyze by type
  const byType = {};
  for (const file of stats) {
    if (!byType[file.type]) {
      byType[file.type] = { count: 0, size: 0 };
    }
    byType[file.type].count++;
    byType[file.type].size += file.size;
  }

  console.log('📈 Breakdown by Type:\n');
  for (const [type, data] of Object.entries(byType)) {
    const percent = ((data.size / totalSize) * 100).toFixed(1);
    console.log(`${type}: ${data.count} files, ${(data.size / 1024).toFixed(2)} KB (${percent}%)`);
  }

  // Identify large files
  console.log('\n⚠️  Large Files (> 50KB):');
  const largeFiles = stats.filter(f => f.size > 50 * 1024);
  if (largeFiles.length === 0) {
    console.log('None found - good job! 🎉');
  } else {
    for (const file of largeFiles) {
      console.log(`- ${file.name}: ${file.sizeKB} KB`);
    }
  }

  // Recommendations
  console.log('\n💡 Recommendations:\n');
  
  // Check for unminified files
  const unminified = stats.filter(f => 
    (f.extension === '.js' || f.extension === '.css') && 
    !f.name.includes('.min.') &&
    f.size > 10 * 1024
  );
  
  if (unminified.length > 0) {
    console.log('1. Consider minifying these files:');
    unminified.forEach(f => console.log(`   - ${f.name}`));
  }

  // Check for images
  const images = stats.filter(f => ['.png', '.jpg', '.jpeg', '.gif'].includes(f.extension));
  if (images.length > 0) {
    const imageSize = images.reduce((sum, f) => sum + f.size, 0);
    if (imageSize > 100 * 1024) {
      console.log(`2. Images total ${(imageSize / 1024).toFixed(2)} KB - consider optimization`);
    }
  }

  // Check CSS size
  const cssFiles = stats.filter(f => f.extension === '.css');
  const cssSize = cssFiles.reduce((sum, f) => sum + f.size, 0);
  if (cssSize > 50 * 1024) {
    console.log(`3. CSS files total ${(cssSize / 1024).toFixed(2)} KB - run CSS optimization`);
  }

  // Check for duplicate functionality
  const jsFiles = stats.filter(f => f.extension === '.js');
  if (jsFiles.length > 10) {
    console.log(`4. ${jsFiles.length} JavaScript files - consider bundling common functionality`);
  }

  console.log('\n✅ Analysis complete!');
  
  // Generate detailed report
  const report = {
    timestamp: new Date().toISOString(),
    totalFiles: stats.length,
    totalSize: totalSize,
    totalSizeKB: (totalSize / 1024).toFixed(2),
    totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
    byType: byType,
    largeFiles: largeFiles.map(f => ({ name: f.name, sizeKB: f.sizeKB })),
    files: stats
  };

  // Save report
  const reportPath = path.join(__dirname, '..', 'bundle-analysis-report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: bundle-analysis-report.json`);
}

function getFileType(ext) {
  const types = {
    '.js': 'JavaScript',
    '.css': 'Stylesheet',
    '.html': 'HTML',
    '.json': 'JSON',
    '.png': 'Image',
    '.jpg': 'Image',
    '.jpeg': 'Image',
    '.gif': 'Image',
    '.svg': 'SVG',
    '.woff': 'Font',
    '.woff2': 'Font',
    '.ttf': 'Font'
  };
  
  return types[ext] || 'Other';
}

// Run analysis
analyzeBundle().catch(console.error);