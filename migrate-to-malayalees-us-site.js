#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SOURCE_DIR = process.cwd(); // Current project
const TARGET_DIR = 'C:\\Users\\gain\\git\\malayalees-us-site';

// Files to copy with their categories
const filesToCopy = {
  // Frontend UI Pages (need header/footer adaptation)
  frontend: [
    'src/app/events/[id]/tickets/page.tsx',
    'src/app/event/success/page.tsx',
    'src/app/event/success/SuccessClient.tsx',
    'src/app/event/success/LoadingTicket.tsx'
  ],

  // Backend/API Files (no UI components)
  backend: [
    'src/app/api/event/success/process/route.ts',
    'src/app/event/success/ApiServerActions.ts',
    'src/pages/api/proxy/events/[id]/transactions/[transactionId]/send-ticket-email.ts',
    'src/pages/api/proxy/events/[id]/transactions/qrcode.ts'
  ],

  // Admin/Utility Files
  admin: [
    'src/app/admin/events/[id]/tickets/list/TicketTableClient.tsx',
    'src/app/admin/promotion-emails/serverActions.ts'
  ],

  // Core files
  core: [
    'src/lib/env.ts',
    'src/types/index.ts'
  ],

  // Assets
  assets: [
    'public/images/buy_tickets_sep_15_parsippany.jpeg'
  ]
};

// Header/Footer component mappings for the new project
const componentMappings = {
  // Replace these imports in frontend files
  header: {
    old: 'PhilantropHeaderClient',
    new: 'MalayaleesHeaderClient' // Adjust based on your new project
  },
  footer: {
    old: 'Footer',
    new: 'MalayaleesFooter' // Adjust based on your new project
  }
};

function copyFile(sourcePath, targetPath, category) {
  try {
    // Create target directory if it doesn't exist
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    let content = fs.readFileSync(sourcePath, 'utf8');

    // Apply transformations based on category
    if (category === 'frontend') {
      content = adaptHeaderFooter(content);
    }

    fs.writeFileSync(targetPath, content);
    console.log(`✅ Copied: ${sourcePath} -> ${targetPath}`);

  } catch (error) {
    console.error(`❌ Error copying ${sourcePath}:`, error.message);
  }
}

function adaptHeaderFooter(content) {
  // Replace header component
  content = content.replace(
    new RegExp(`import.*${componentMappings.header.old}.*from.*['"][^'"]*['"]`, 'g'),
    `import { ${componentMappings.header.new} } from '@/components/${componentMappings.header.new}';`
  );

  // Replace footer component
  content = content.replace(
    new RegExp(`import.*${componentMappings.footer.old}.*from.*['"][^'"]*['"]`, 'g'),
    `import { ${componentMappings.footer.new} } from '@/components/${componentMappings.footer.new}';`
  );

  // Replace component usage
  content = content.replace(
    new RegExp(`<${componentMappings.header.old}`, 'g'),
    `<${componentMappings.header.new}`
  );

  content = content.replace(
    new RegExp(`<${componentMappings.footer.old}`, 'g'),
    `<${componentMappings.footer.new}`
  );

  return content;
}

function migrateFiles() {
  console.log('🚀 Starting migration to malayalees-us-site...\n');

  // Copy files by category
  Object.entries(filesToCopy).forEach(([category, files]) => {
    console.log(`\n📁 Processing ${category} files:`);

    files.forEach(file => {
      const sourcePath = path.join(SOURCE_DIR, file);
      const targetPath = path.join(TARGET_DIR, file);

      if (fs.existsSync(sourcePath)) {
        copyFile(sourcePath, targetPath, category);
      } else {
        console.log(`⚠️  File not found: ${sourcePath}`);
      }
    });
  });

  console.log('\n🎉 Migration completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Review the copied files in the target project');
  console.log('2. Update component imports if needed');
  console.log('3. Test the functionality');
  console.log('4. Update any project-specific configurations');
}

// Run the migration
migrateFiles();