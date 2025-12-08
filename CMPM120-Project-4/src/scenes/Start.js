export class Start extends Phaser.Scene 
{
    constructor() {
        super('Start');
    }

    preload()
    {
        // PLAYER
        this.load.image('idle0', 'assets/player_idle.png');
        this.load.image('walk0', 'assets/player_walk1.png');
        this.load.image('walk1', 'assets/player_walk2.png');

        // OBJECTS
        this.load.image('mace', 'assets/mace.png');
        this.load.image('collect', 'assets/collect.png');
        this.load.image('flag', 'assets/flag.png');
        this.load.image('bullet', 'assets/collect.png');

        // ENEMY
        this.load.image('enemy', 'assets/enemy.png');

        // MAP
        this.load.image('tilesheet', 'assets/tilesheet.png');
        this.load.tilemapTiledJSON('tilemap1', 'assets/tilemap1.tmj');

        // AUDIO
        this.load.audio('collectSFX', 'assets/collect.wav');
    }

    create()
    {
        /* ---------- ANIMS ---------- */
        this.anims.create({ key:'idle', frames:[{key:'idle0'}], repeat:-1 });
        this.anims.create({ key:'walk', frames:[{key:'walk0'},{key:'walk1'}], frameRate:10, repeat:-1 });

        /* ---------- PLAYER ---------- */
        this.player = this.physics.add.sprite(128,480,'idle0');
        this.player.body.setAllowGravity(false);
        this.player.setCollideWorldBounds(true);
        this.player.play('idle');

        this.player.maxHealth = 100;
        this.player.health = 100;
        this.player.invincible = false;

        /* ---------- BULLETS ---------- */
        this.bullets = this.physics.add.group({
            defaultKey: 'bullet',
            maxSize: 100
        });

        /* ---------- ENEMIES ---------- */
        this.enemies = this.physics.add.group();

        /* ---------- INPUT ---------- */
        this.up    = this.input.keyboard.addKey('W');
        this.down  = this.input.keyboard.addKey('S');
        this.left  = this.input.keyboard.addKey('A');
        this.right = this.input.keyboard.addKey('D');

        this.isShooting = false;
        this.fireRate = 500; // ms
        this.lastShotTime = 0;

        this.input.on('pointerdown', () => this.isShooting = true);
        this.input.on('pointerup',   () => this.isShooting = false);

        /* ---------- WAVES ---------- */
        this.wave = 1;
        this.spawnWave();

        /* ---------- MAP ---------- */
        this.loadMap('tilemap1');

        /* ---------- CAMERA ---------- */
        this.cameras.main.startFollow(this.player);

        /* ---------- HUD (DEPTH FIX) ---------- */
        this.healthText = this.add.text(16,16,'HP: 100',{
            fontSize:'16px',
            fill:'#fff'
        }).setScrollFactor(0).setDepth(1000);

        this.waveText = this.add.text(16,36,'Wave: 1',{
            fontSize:'16px',
            fill:'#fff'
        }).setScrollFactor(0).setDepth(1000);
    }

    loadMap(key)
    {
        if (this.map) this.map.destroy();
        this.map = this.make.tilemap({ key });
        const tileset = this.map.addTilesetImage('tileset', 'tilesheet');

        const collision = this.map.createLayer('collision', tileset, 0, 0);
        collision.setCollisionBetween(0, 97);

        this.physics.add.collider(this.player, collision);
        this.physics.add.collider(this.bullets, collision, b=>b.destroy());
        this.physics.add.collider(this.enemies, collision);

        this.cameras.main.setBounds(0,0,this.map.widthInPixels,this.map.heightInPixels);
    }

    /* ==================== SHOOT ==================== */
    shoot()
    {
        const bullet = this.bullets.get(this.player.x, this.player.y);
        if (!bullet) return;

        bullet.setActive(true);
        bullet.setVisible(true);
        bullet.body.allowGravity = false;

        const pointer = this.input.activePointer;

        const angle = Phaser.Math.Angle.Between(
            this.player.x,
            this.player.y,
            pointer.worldX,
            pointer.worldY
        );

        bullet.setRotation(angle);

        const speed = 600;
        bullet.setVelocity(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed
        );

        this.time.delayedCall(1500, ()=>{
            if (bullet.active) bullet.destroy();
        });
    }

    /* ==================== WAVES ==================== */
    spawnWave()
    {
        const enemyCount = 3 + this.wave * 2;

        for (let i = 0; i < enemyCount; i++) {
            const x = Phaser.Math.Between(100, 1000);
            const y = Phaser.Math.Between(100, 800);

            const e = this.enemies.create(x, y, 'enemy');
            e.body.setAllowGravity(false);
            e.health = 3 + this.wave;
            e.speed = 80 + this.wave * 10;
        }

        //this.waveText.setText(`Wave: ${this.wave}`);

        this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, null, this);
        this.physics.add.overlap(this.player, this.enemies, this.hitPlayer, null, this);
    }

    hitEnemy(bullet, enemy)
    {
        bullet.destroy();
        enemy.health--;

        if (enemy.health <= 0) {
            enemy.destroy();

            if (this.enemies.countActive() === 0) {
                this.wave++;
                this.time.delayedCall(1000, ()=>this.spawnWave());
            }
        }
    }

    /* ==================== PLAYER HIT ==================== */
    hitPlayer(player, enemy)
    {
        if (player.invincible) return;

        enemy.destroy(); // ✅ ENEMY DIES ON HIT

        player.health -= 10;
        this.healthText.setText(`HP: ${player.health}`);
        player.invincible = true;

        this.time.delayedCall(800, ()=>player.invincible = false);

        if (player.health <= 0) {
            this.scene.restart();
        }
    }

    /* ==================== UPDATE ==================== */
    update(time)
    {
        const speed = 220;
        let vx = 0;
        let vy = 0;

        if (this.left.isDown)  vx = -speed;
        if (this.right.isDown) vx = speed;
        if (this.up.isDown)    vy = -speed;
        if (this.down.isDown)  vy = speed;

        this.player.setVelocity(vx, vy);

        if (vx || vy) this.player.play('walk', true);
        else this.player.play('idle', true);

        /* HOLD SHOOT */
        if (this.isShooting && time > this.lastShotTime + this.fireRate) {
            this.shoot();
            this.lastShotTime = time;
        }

        /* ENEMY AI */
        this.enemies.children.iterate(enemy=>{
            if (!enemy) return;
            this.physics.moveToObject(enemy, this.player, enemy.speed);
        });
    }
}
