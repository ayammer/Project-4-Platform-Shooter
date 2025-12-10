export class Start extends Phaser.Scene 
{
    constructor() {
        super('Start');
    }

    preload()
    {
        // player load along with some simple animations
        this.load.image('idle0', 'assets/player_idle.png');
        this.load.image('walk0', 'assets/player_walk1.png');
        this.load.image('walk1', 'assets/player_walk2.png');
        this.load.image('hurt',  'assets/player_jump.png'); 

        // JUicEEEEE
        this.load.image('mace', 'assets/mace.png');       
        this.load.image('healthPack', 'assets/flag.png'); 
        this.load.image('bullet', 'assets/collect.png');  

        // simple enemy
        this.load.image('enemy', 'assets/enemy.png');

        // map load
        this.load.image('tilesheet', 'assets/tilesheet.png');
        this.load.tilemapTiledJSON('tilemap1', 'assets/tilemap1.tmj');

        // audio juice
        this.load.audio('killSFX', 'assets/collect.wav'); 
        this.load.audio('hitSFX', 'assets/hit.wav');      
        this.load.audio('shotgunSFX', 'assets/jump.wav'); 
    }

    create()
    {
        this.input.mouse.disableContextMenu();

        // for game state
        this.isGameOver = false;
        
        // weapon creation, we have 3 guns, with different stats
        this.currentWeaponIdx = 0; 
        this.weapons = [
            { 
                name: "SHOTGUN", 
                ammo: 8, maxAmmo: 8, 
                reloadTime: 5000, 
                lastShot: 0, 
                fireRate: 600, 
                isReloading: false 
            },
            { 
                name: "SNIPER",  
                ammo: 5, maxAmmo: 5, 
                reloadTime: 5000, 
                lastShot: 0, 
                fireRate: 1200, 
                isReloading: false 
            },
            { 
                name: "RIFLE",   
                ammo: 20, maxAmmo: 20, 
                reloadTime: 3000, 
                lastShot: 0, 
                fireRate: 150, 
                isReloading: false 
            }
        ];

        // animation of walking
        this.anims.create({ key:'idle', frames:[{key:'idle0'}], repeat:-1 });
        this.anims.create({ key:'walk', frames:[{key:'walk0'},{key:'walk1'}], frameRate:10, repeat:-1 });

        // juice 
        this.killSound = this.sound.add('killSFX');
        this.hitSound = this.sound.add('hitSFX');
        this.gunSound = this.sound.add('shotgunSFX');

        // player mechanics and physics, VERY IMPORTANT
        this.player = this.physics.add.sprite(128,480,'idle0');
        this.player.body.setAllowGravity(false);
        this.player.setCollideWorldBounds(true);
        this.player.play('idle');

        this.player.maxHealth = 100;
        this.player.health = 100;
        this.player.invincible = false;

        // bullet and enemy group
        this.bullets = this.physics.add.group({ defaultKey: 'bullet', maxSize: 50 });
        this.enemies = this.physics.add.group();
        this.enemyProjectiles = this.physics.add.group(); 
        this.pickups = this.physics.add.group();          

        // movement, arrow keys
        this.up    = this.input.keyboard.addKey('W');
        this.down  = this.input.keyboard.addKey('S');
        this.left  = this.input.keyboard.addKey('A');
        this.right = this.input.keyboard.addKey('D');
        this.space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        
        // shift = weapon switching
        this.input.keyboard.on('keydown-SHIFT', () => {
            this.currentWeaponIdx = (this.currentWeaponIdx + 1) % 3;
            this.updateWeaponUI();
        });

        // HP
        this.hpBars = this.add.graphics().setDepth(50); 

        this.loadMap('tilemap1');
        this.cameras.main.startFollow(this.player);

        // UI
        this.healthText = this.add.text(16, 16, 'HP: 100', { 
            fontSize:'20px', fill:'#fff', stroke: '#000', strokeThickness: 4 
        }).setScrollFactor(0).setDepth(1000);

        this.topText = this.add.text(this.cameras.main.width / 2, 20, '', { 
            fontSize:'24px', fill:'#ffff00', stroke: '#000', strokeThickness: 4 
        }).setScrollFactor(0).setDepth(1000).setOrigin(0.5, 0);

        this.controlsText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height - 40, 
            'WASD: Move | MOUSE: Aim | SPACE: Shoot | SHIFT: Switch Weapon', { 
            fontSize:'16px', fill:'#aaa', stroke: '#000', strokeThickness: 3 
        }).setScrollFactor(0).setDepth(1000).setOrigin(0.5);

        // game end screen
        this.createGameOverScreen();
        
        // Start Game
        this.wave = 1;
        this.updateWeaponUI();
        this.spawnWave();
        this.time.addEvent({ delay: 2000, callback: this.enemyShoot, callbackScope: this, loop: true });
    }

    createGameOverScreen()
    {
        const cw = this.cameras.main.width;
        const ch = this.cameras.main.height;

        this.gameOverContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(2000).setVisible(false);

        const bg = this.add.rectangle(cw/2, ch/2, cw, ch, 0x000000, 0.7);
        
        const title = this.add.text(cw/2, ch/2 - 50, 'GAME OVER', {
            fontSize: '64px', fill: '#ff0000', stroke: '#000', strokeThickness: 6, fontStyle: 'bold'
        }).setOrigin(0.5);

        const btn = this.add.text(cw/2, ch/2 + 50, 'PLAY AGAIN', {
            fontSize: '32px', fill: '#ffffff', backgroundColor: '#333333', padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btn.on('pointerover', () => btn.setStyle({ fill: '#ffff00', backgroundColor: '#555555' }));
        btn.on('pointerout', () => btn.setStyle({ fill: '#ffffff', backgroundColor: '#333333' }));
        
        btn.on('pointerdown', () => {
            this.scene.restart();
        });

        this.gameOverContainer.add([bg, title, btn]);
    }

    triggerGameOver()
    {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.physics.pause();
        this.player.setTint(0x555555);
        this.gameOverContainer.setVisible(true);
    }

    loadMap(key)
    {
        // map logic + physics
        if (this.map) this.map.destroy();
        this.map = this.make.tilemap({ key });
        const tileset = this.map.addTilesetImage('tileset', 'tilesheet');
        const collision = this.map.createLayer('collision', tileset, 0, 0);
        collision.setCollisionBetween(0, 97);
        // collisions
        this.physics.add.collider(this.player, collision);
        this.physics.add.collider(this.bullets, collision, b=>b.destroy());
        this.physics.add.collider(this.enemyProjectiles, collision, p=>p.destroy());
        this.physics.add.collider(this.enemies, collision);
        
        this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    }
    // weapon + ammo logic so guns aren't spammable
    updateWeaponUI() {
        const weapon = this.weapons[this.currentWeaponIdx];
        let status = `${weapon.ammo}/${weapon.maxAmmo}`;
        
        if (weapon.isReloading) {
            status = "RELOADING...";
        }

        this.topText.setText(`Wave: ${this.wave}  |  ${weapon.name}: ${status}`);
    }
    // reload for guns above
    startReload(weapon) {
        if (weapon.isReloading || weapon.ammo === weapon.maxAmmo) return;

        weapon.isReloading = true;
        this.updateWeaponUI();

        this.time.delayedCall(weapon.reloadTime, () => {
            weapon.ammo = weapon.maxAmmo;
            weapon.isReloading = false;
            // Only update UI if we are still holding this weapon
            if (this.weapons[this.currentWeaponIdx] === weapon) {
                this.updateWeaponUI();
            }
        });
    }

    // shooting system
    handleShooting(time)
    {
        if (!this.space.isDown) return;

        const weapon = this.weapons[this.currentWeaponIdx];

        if (weapon.isReloading) return;

        if (weapon.ammo <= 0) {
            this.startReload(weapon);
            return;
        }

        if (time < weapon.lastShot + weapon.fireRate) return;
        // ammo is used
        const pointer = this.input.activePointer;
        weapon.lastShot = time;
        weapon.ammo--;
        this.updateWeaponUI();
        // different stats for guns
        if (weapon.name === "SHOTGUN") {
            this.gunSound.play({ volume: 0.5, detune: -200 }); 
            this.fireShotgun(pointer);
        } 
        else if (weapon.name === "SNIPER") {
            this.gunSound.play({ volume: 0.8, detune: -800 }); 
            this.fireSniper(pointer);
        }
        else if (weapon.name === "RIFLE") {
            this.gunSound.play({ volume: 0.3, detune: 400 }); 
            this.fireRifle(pointer);
        }
    }
    // shotgun logic
    fireShotgun(pointer) {
        const baseAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.worldX, pointer.worldY);
        for (let i = -1; i <= 1; i++) {
            const bullet = this.bullets.get(this.player.x, this.player.y);
            if (!bullet) continue;
            bullet.setActive(true).setVisible(true).body.allowGravity = false;
            bullet.setScale(0.8).setTint(0xffff00); 
            bullet.damage = 1; 

            const angle = baseAngle + (i * 0.15); 
            bullet.setRotation(angle);
            this.physics.velocityFromRotation(angle, 500, bullet.body.velocity);
            this.time.delayedCall(300, () => { if (bullet.active) bullet.destroy(); }); 
        }
    }
    // sniper logic
    fireSniper(pointer) {
        const bullet = this.bullets.get(this.player.x, this.player.y);
        if (!bullet) return;
        bullet.setActive(true).setVisible(true).body.allowGravity = false;
        bullet.setScale(1.2).setTint(0xff0000); 
        bullet.damage = 5; 

        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.worldX, pointer.worldY);
        bullet.setRotation(angle);
        this.physics.velocityFromRotation(angle, 1000, bullet.body.velocity);
        this.time.delayedCall(2000, () => { if (bullet.active) bullet.destroy(); });
    }
    // rifle logic
    fireRifle(pointer) {
        const bullet = this.bullets.get(this.player.x, this.player.y);
        if (!bullet) return;
        bullet.setActive(true).setVisible(true).body.allowGravity = false;
        bullet.setScale(0.7).setTint(0x00ffff); 
        bullet.damage = 1; 

        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.worldX, pointer.worldY);
        const spread = Phaser.Math.FloatBetween(-0.05, 0.05);
        bullet.setRotation(angle + spread);
        this.physics.velocityFromRotation(angle + spread, 700, bullet.body.velocity);
        this.time.delayedCall(2000, () => { if (bullet.active) bullet.destroy(); });
    }

    // wave mechanics
    spawnWave()
    {
        const enemyCount = 4 + this.wave;
        this.updateWeaponUI();

        const mapW = this.map.widthInPixels;
        const mapH = this.map.heightInPixels;
        const margin = 80;
        const safeRadius = 300; // Minimum distance from player

        for (let i = 0; i < enemyCount; i++) {
            let x, y, distance;
            let attempts = 0;

            // spawn safe so that enemies don't spawn too close to player
            do {
                x = Phaser.Math.Between(margin, mapW - margin);
                y = Phaser.Math.Between(margin, mapH - margin);
                // Calculate distance to player
                distance = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
                attempts++;
            } while (distance < safeRadius && attempts < 50); // reattempt?

            const type = Phaser.Math.Between(0, 10);
            const e = this.enemies.create(x, y, 'enemy');
            e.body.setAllowGravity(false);
            e.setCollideWorldBounds(true);

            if (type > 7) { 
                e.setTint(0xff0000); 
                e.health = 1; e.maxHealth = 1; 
                e.speed = 220; e.isTank = false;
            } else if (type > 5) {
                e.setTint(0x0000ff); 
                e.health = 8; e.maxHealth = 8; 
                e.speed = 40; e.isTank = true;
                e.setScale(1.5);
            } else {
                e.health = 3; e.maxHealth = 3; 
                e.speed = 90; e.isTank = false;
            }
        }
        // collision
        this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, null, this);
        this.physics.add.overlap(this.player, this.enemies, this.hitPlayer, null, this);
        this.physics.add.overlap(this.player, this.enemyProjectiles, this.hitPlayer, null, this);
        this.physics.add.overlap(this.player, this.pickups, this.collectPickup, null, this);
    }

    // UI juice
    drawEnemyHealthBars()
    {
        this.hpBars.clear();

        this.enemies.children.iterate(enemy => {
            if (!enemy || !enemy.active) return;

            const w = 40;
            const h = 6;
            const x = enemy.x - w / 2;
            const y = enemy.y - enemy.height/2 - 15;

            this.hpBars.fillStyle(0xff0000);
            this.hpBars.fillRect(x, y, w, h);

            const healthPct = enemy.health / enemy.maxHealth;
            if (healthPct > 0) {
                this.hpBars.fillStyle(0x00ff00);
                this.hpBars.fillRect(x, y, w * healthPct, h);
            }
        });
    }

    // combat stuff and effects below
    enemyShoot() {
        if (this.isGameOver) return;
        this.enemies.children.iterate(e => {
            if (e && e.active && e.isTank) {
                const mace = this.enemyProjectiles.create(e.x, e.y, 'mace');
                mace.body.setAllowGravity(false).setAngularVelocity(300); 
                this.physics.moveToObject(mace, this.player, 150);
                this.time.delayedCall(3000, () => mace.destroy());
            }
        });
    }
    // bullet logic
    hitEnemy(bullet, enemy)
    {
        const dmg = bullet.damage || 1;
        bullet.destroy();
        enemy.health -= dmg;
        
        this.killSound.play({ volume: 0.3, detune: Phaser.Math.Between(-100, 100) });

        if (enemy.health <= 0) {
            this.dropItem(enemy.x, enemy.y);
            enemy.destroy();

            if (this.enemies.countActive() === 0) {
                this.wave++;
                this.time.delayedCall(1000, ()=>this.spawnWave());
            }
        }
    }
    // powerups?
    dropItem(x, y) {
        if (Phaser.Math.Between(0, 100) < 20) {
            const pack = this.pickups.create(x, y, 'healthPack');
            pack.body.setAllowGravity(false);
            this.tweens.add({ targets: pack, y: y-10, duration: 1000, yoyo: true, repeat: -1 });
        }
    }

    collectPickup(player, pack) {
        pack.destroy();
        player.health = Math.min(player.health + 20, 100);
        this.healthText.setText(`HP: ${player.health}`);
        this.cameras.main.flash(200, 0, 255, 0); 
    }
    // player hp/damage logic
    hitPlayer(player, source)
    {
        if (player.invincible || this.isGameOver) return;

        if (source.texture.key === 'mace') source.destroy();

        player.health -= 10;
        this.healthText.setText(`HP: ${player.health}`);
        
        player.setTexture('hurt'); 
        player.setTint(0xff0000);
        this.hitSound.play();
        this.cameras.main.shake(100, 0.01);

        player.invincible = true;
        
        this.time.delayedCall(500, () => {
            if (!this.isGameOver) {
                player.clearTint();
                player.setTexture('idle0'); 
                player.invincible = false;
            }
        });

        if (player.health <= 0) {
            this.triggerGameOver();
        }
    }

    // important here
    update(time)
    {
        if (this.isGameOver) return; 

        const speed = 220;
        let vx = 0; let vy = 0;

        if (this.left.isDown)  vx = -speed;
        if (this.right.isDown) vx = speed;
        if (this.up.isDown)    vy = -speed;
        if (this.down.isDown)  vy = speed;

        this.player.setVelocity(vx, vy);

        if (vx < 0) {
            this.player.setFlipX(true); 
        } else if (vx > 0) {
            this.player.setFlipX(false); 
        }

        if (!this.player.invincible) {
            if (vx || vy) this.player.play('walk', true);
            else this.player.play('idle', true);
        }

        this.handleShooting(time);
        this.drawEnemyHealthBars(); 

        this.enemies.children.iterate(enemy => {
            if (enemy && enemy.active) {
                this.physics.moveToObject(enemy, this.player, enemy.speed);
            }
        });
    }
}