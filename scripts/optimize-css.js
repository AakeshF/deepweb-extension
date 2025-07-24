const fs = require('fs').promises;
const path = require('path');
const { PurgeCSS } = require('purgecss');

/**
 * CSS Optimization Script
 * Removes unused CSS rules to reduce bundle size
 */

async function optimizeCSS() {
  console.log('Starting CSS optimization...\n');

  const cssFiles = [
    'content/styles-modular.css',
    'content/styles/template-selector.css'
  ];

  const contentFiles = [
    'content/**/*.js',
    'content/**/*.html',
    'src/**/*.js',
    'popup/**/*.html',
    'popup/**/*.js'
  ];

  try {
    // Process each CSS file
    for (const cssFile of cssFiles) {
      const cssPath = path.resolve(__dirname, '..', cssFile);
      
      // Check if file exists
      try {
        await fs.access(cssPath);
      } catch {
        console.log(`Skipping ${cssFile} (not found)`);
        continue;
      }

      // Read original CSS
      const originalCSS = await fs.readFile(cssPath, 'utf8');
      const originalSize = Buffer.byteLength(originalCSS);

      // Run PurgeCSS
      const purgeCSSResult = await new PurgeCSS().purge({
        content: contentFiles.map(pattern => ({
          raw: '',
          extension: 'js',
          glob: path.resolve(__dirname, '..', pattern)
        })),
        css: [{
          raw: originalCSS,
          name: cssFile
        }],
        safelist: {
          standard: [
            // Preserve dynamic classes
            /^deepweb-/,
            /^theme-/,
            /^animation-/,
            /^mobile-/,
            /^dark-mode/,
            /^light-mode/,
            /^sepia-mode/,
            /^high-contrast/,
            // Preserve state classes
            /active$/,
            /disabled$/,
            /hidden$/,
            /visible$/,
            /expanded$/,
            /collapsed$/,
            // Preserve responsive classes
            /^sm-/,
            /^md-/,
            /^lg-/
          ],
          deep: [
            // Preserve classes used in shadow DOM
            /^shadow-/
          ],
          greedy: [
            // Preserve animation keyframes
            /@keyframes/
          ]
        },
        variables: true,
        keyframes: true,
        fontFace: true
      });

      if (purgeCSSResult.length > 0) {
        const optimizedCSS = purgeCSSResult[0].css;
        const optimizedSize = Buffer.byteLength(optimizedCSS);
        
        // Calculate reduction
        const reduction = ((originalSize - optimizedSize) / originalSize * 100).toFixed(2);
        
        // Create optimized file
        const optimizedPath = cssPath.replace('.css', '.optimized.css');
        await fs.writeFile(optimizedPath, optimizedCSS);
        
        console.log(`✓ ${cssFile}`);
        console.log(`  Original: ${(originalSize / 1024).toFixed(2)}KB`);
        console.log(`  Optimized: ${(optimizedSize / 1024).toFixed(2)}KB`);
        console.log(`  Reduction: ${reduction}%`);
        console.log(`  Saved to: ${path.basename(optimizedPath)}\n`);
      }
    }

    // Additional CSS optimizations
    console.log('\nApplying additional optimizations...');
    
    // Combine and minify all CSS files
    const allOptimizedCSS = [];
    
    for (const cssFile of cssFiles) {
      const optimizedPath = path.resolve(__dirname, '..', cssFile.replace('.css', '.optimized.css'));
      try {
        const css = await fs.readFile(optimizedPath, 'utf8');
        allOptimizedCSS.push(css);
      } catch {
        // Fall back to original if optimized doesn't exist
        const originalPath = path.resolve(__dirname, '..', cssFile);
        try {
          const css = await fs.readFile(originalPath, 'utf8');
          allOptimizedCSS.push(css);
        } catch {
          console.log(`Warning: Could not read ${cssFile}`);
        }
      }
    }

    // Combine all CSS
    const combinedCSS = allOptimizedCSS.join('\n\n');
    
    // Apply final optimizations
    const finalCSS = combinedCSS
      // Remove comments
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Remove unnecessary whitespace
      .replace(/\s+/g, ' ')
      // Remove whitespace around selectors
      .replace(/\s*([{}:;,])\s*/g, '$1')
      // Remove trailing semicolons before closing braces
      .replace(/;}/g, '}')
      // Remove empty rules
      .replace(/[^{}]+\{\s*\}/g, '')
      // Optimize color values
      .replace(/#([0-9a-fA-F])\1([0-9a-fA-F])\2([0-9a-fA-F])\3/g, '#$1$2$3')
      // Optimize zero values
      .replace(/:\s*0px/g, ':0')
      .replace(/:\s*0\s+0\s+0\s+0/g, ':0')
      // Optimize font weights
      .replace(/font-weight:\s*normal/g, 'font-weight:400')
      .replace(/font-weight:\s*bold/g, 'font-weight:700');

    // Save combined optimized CSS
    const combinedPath = path.resolve(__dirname, '..', 'dist/styles.combined.min.css');
    await fs.mkdir(path.dirname(combinedPath), { recursive: true });
    await fs.writeFile(combinedPath, finalCSS);
    
    const finalSize = Buffer.byteLength(finalCSS);
    console.log(`\n✓ Combined and minified CSS`);
    console.log(`  Final size: ${(finalSize / 1024).toFixed(2)}KB`);
    console.log(`  Saved to: dist/styles.combined.min.css`);

    console.log('\n✅ CSS optimization complete!');

  } catch (error) {
    console.error('Error during CSS optimization:', error);
    process.exit(1);
  }
}

// Run optimization
optimizeCSS();