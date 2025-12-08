import { Start } from './scenes/Start.js';

const config = {
    type: Phaser.AUTO,
    title: 'CMPM 120 Project 3',
    description: '',
    parent: 'game-container',
    width: 1280,
    height: 720,
    backgroundColor: '#ffffffff',
    pixelArt: true,
    physics: {default: 'arcade',arcade:{debug:true}},
    scene: [
    Start
    ],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
}

new Phaser.Game(config);
            