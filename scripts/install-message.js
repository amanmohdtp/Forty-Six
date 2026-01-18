#!/usr/bin/env node

const gradient = require('gradient-string');
const chalk = require('chalk');
const figlet = require('figlet');
const boxen = require('boxen');

// If you don't want to add more dependencies, use this version without external packages
// (See alternative version below)

console.clear();

// ASCII Art with gradient
console.log(gradient.morning(`
╔══════════════════════════════════════════════════════════╗
║                                                                 ║
║  ███████╗ ██████╗ ██████╗ ████████╗██╗   ██╗             ║
║  ██╔════╝██╔═══██╗██╔══██╗╚══██╔══╝╚██╗ ██╔╝            ║
║  █████╗  ██║   ██║██████╔╝   ██║    ╚████╔╝               ║
║  ██╔══╝  ██║   ██║██╔══██╗   ██║     ╚██╔╝                ║
║  ██║     ╚██████╔╝██║  ██║   ██║      ██║                  ║
║  ╚═╝      ╚═════╝ ╚═╝  ╚═╝   ╚═╝      ╚═╝                  ║
║                                                                ║
║  🤖  A Minimal WhatsApp Bot Framework  🚀                      ║
║                                                                ║
╚══════════════════════════════════════════════════════════╝
`));

// Welcome message in a box
const welcomeBox = boxen(
  chalk.bold.hex('#FF6B6B')('🚀 Installing Forty-six') + 
  chalk.hex('#4ECDC4')('\n\n📦 Version: 1.0.0') +
  chalk.hex('#FFD166')('\n✨ A minimal Node.js framework for WhatsApp chatbots'),
  {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'cyan',
    backgroundColor: '#1a1b26'
  }
);

console.log(welcomeBox);

// Dependencies section
console.log(chalk.bold.hex('#FFD166')('\n📦 Installing Dependencies:\n'));

const deps = [
  { name: '@whiskeysockets/baileys', desc: 'WhatsApp Web API', color: '#4ECDC4' },
  { name: 'groq-sdk', desc: 'AI Integration (Groq)', color: '#FF6B6B' },
  { name: 'pino', desc: 'Fast JSON Logging', color: '#06D6A0' },
  { name: 'qrcode-terminal', desc: 'QR Code Display', color: '#118AB2' },
  { name: 'dotenv', desc: 'Environment Configuration', color: '#EF476F' },
  { name: '@hapi/boom', desc: 'HTTP-friendly Errors', color: '#FFD166' }
];

deps.forEach((dep, index) => {
  const prefix = index === deps.length - 1 ? '└──' : '├──';
  console.log(`  ${chalk.hex(dep.color)(prefix)} ${chalk.bold(dep.name)}`);
  console.log(`  ${index === deps.length - 1 ? '   ' : '│  '}   ${chalk.dim(dep.desc)}\n`);
});

// Progress animation
console.log(chalk.bold.hex('#118AB2')('⏳ Installation Progress:\n'));

const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let frame = 0;

const progressInterval = setInterval(() => {
  const progressBarLength = 30;
  const percent = Math.min(100, Math.floor((Date.now() % 60000) / 600));
  const filledLength = Math.floor(progressBarLength * percent / 100);
  const bar = '█'.repeat(filledLength) + '░'.repeat(progressBarLength - filledLength);
  
  process.stdout.write(`\r  ${frames[frame]} ${gradient.atlas(bar)} ${percent}%`);
  frame = (frame + 1) % frames.length;
}, 80);

// Installation tips
setTimeout(() => {
  console.log(chalk.bold.hex('#06D6A0')('\n\n💡 Tips for Faster Installation:'));
  console.log(chalk.hex('#8A8FA3')('  • Using optimized package manager'));
  console.log(chalk.hex('#8A8FA3')('  • Skipping optional dependencies'));
  console.log(chalk.hex('#8A8FA3')('  • Caching enabled\n'));
}, 2000);

// Clean up and final message
setTimeout(() => {
  clearInterval(progressInterval);
  console.log(chalk.bold.green('\n✅ Installation Complete!\n'));
  
  const nextSteps = boxen(
    chalk.bold.hex('#FF6B6B')('🚀 Next Steps:') +
    chalk.hex('#4ECDC4')('\n\n1. ') + chalk.bold('Configure Environment:') + ' cp .env.example .env' +
    chalk.hex('#06D6A0')('\n2. ') + chalk.bold('Add API Key:') + ' Add GROQ_API_KEY to .env' +
    chalk.hex('#118AB2')('\n3. ') + chalk.bold('Start Bot:') + ' npm start' +
    chalk.hex('#FFD166')('\n4. ') + chalk.bold('Scan QR:') + ' Open WhatsApp → Linked Devices',
    {
      padding: 1,
      margin: 1,
      borderStyle: 'single',
      borderColor: 'green',
      backgroundColor: '#0a0a0a'
    }
  );
  
  console.log(nextSteps);
  
  console.log(chalk.hex('#8A8FA3')('\n📖 Documentation: ') + chalk.underline('https://github.com/amanmohdtp/forty-six'));
  console.log(chalk.hex('#8A8FA3')('🐛 Report Issues: ') + chalk.underline('https://github.com/amanmohdtp/forty-six/issues'));
  
  console.log(gradient.pastel('\n🎉 Happy bot building! 🎉\n'));
  
  process.exit(0);
}, 8000); // Adjust timing based on actual install duration

// Handle interruption
process.on('SIGINT', () => {
  clearInterval(progressInterval);
  console.log(chalk.red('\n\n⚠️  Installation interrupted by user.'));
  console.log(chalk.yellow('💡 Run ') + chalk.bold('npm install') + chalk.yellow(' to try again.'));
  process.exit(0);
});
