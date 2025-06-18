const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const JavaScriptObfuscator = require('javascript-obfuscator');
const UglifyJS = require('uglify-js');

const filesToProcess = [
    './src/electron-starter.js',
    './src/shared',
  './src/core'
];

const outputDir = './dist-src';

const obfuscateWithUglify = (content) => {
    const result = UglifyJS.minify(content);
    if (result.error) {
        console.error('UglifyJS Error:', result.error);
        return content; // Retorna o conteúdo original em caso de erro
    }
    return result.code;
};

const obfuscateFile = (filePath, targetPath) => {
    const content = fs.readFileSync(filePath, 'utf8');

    // Primeira ofuscação com JavaScriptObfuscator
    const firstObfuscation = JavaScriptObfuscator.obfuscate(content, {
        compact: true,
        controlFlowFlattening: true,
        deadCodeInjection: true,
        debugProtection: true,
        disableConsoleOutput: false,
    }).getObfuscatedCode();

    // Segunda ofuscação com UglifyJS
    const secondObfuscation = obfuscateWithUglify(firstObfuscation);

    // Escreve o arquivo final ofuscado
    fs.writeFileSync(targetPath, secondObfuscation);
    console.log(`Double obfuscated: ${filePath} -> ${targetPath}`);
};

const processItem = (inputPath, outputPath) => {
    if (fs.statSync(inputPath).isDirectory()) {
        fs.mkdirSync(outputPath, { recursive: true });
        const files = fs.readdirSync(inputPath);
        files.forEach((file) => {
            const fullInputPath = path.join(inputPath, file);
            const fullOutputPath = path.join(outputPath, file);
            processItem(fullInputPath, fullOutputPath);
        });
    } else if (inputPath.endsWith('.js')) {
        obfuscateFile(inputPath, outputPath);
    } else {
        fse.copySync(inputPath, outputPath);
        console.log(`Copied: ${inputPath} -> ${outputPath}`);
    }
};

// Remove a pasta de saída anterior e recria
fse.removeSync(outputDir);
fs.mkdirSync(outputDir, { recursive: true });

// Processa cada arquivo ou pasta especificada
filesToProcess.forEach((filePath) => {
    const absolutePath = path.resolve(filePath);
    const relativeOutputPath = path.relative('./src', filePath);
    const fullOutputPath = path.join(outputDir, relativeOutputPath);

    processItem(absolutePath, fullOutputPath);
});

console.log(`Double code obfuscation completed. Files are in: ${outputDir}`);
