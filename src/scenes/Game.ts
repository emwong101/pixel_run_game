import axios from "axios";
import Phaser from "phaser";
import AnimationKeys from "../consts/AnimsKeys";
import SceneKeys from "../consts/SceneKeys";
import TextureKeys from "../consts/TextureKeys";
import LaserObstacle from "../game/LaserObstacle";
import GameSprite from "../game/SpriteCharacter";
import { v4 as uuidv4 } from "uuid";

export default class Game extends Phaser.Scene {
  private background!: Phaser.GameObjects.TileSprite;
  private floor!: Phaser.GameObjects.TileSprite;
  private building1!: Phaser.GameObjects.Image;
  private building2!: Phaser.GameObjects.Image;
  private building3!: Phaser.GameObjects.Image;
  private building4!: Phaser.GameObjects.Image;
  private building5!: Phaser.GameObjects.Image;
  private cloud1!: Phaser.GameObjects.Image;
  private cloud2!: Phaser.GameObjects.Image;
  private cloud3!: Phaser.GameObjects.Image;
  private cat!: Phaser.GameObjects.Sprite;
  private coins!: Phaser.Physics.Arcade.StaticGroup;
  private gems!: Phaser.Physics.Arcade.StaticGroup;

  private laserObstacle!: LaserObstacle;
  private gameSprite!: GameSprite;

  private buildings: Phaser.GameObjects.Image[] = [];
  private buildingsList: Phaser.GameObjects.Image[] = [];

  private scoreLabel!: Phaser.GameObjects.Text;
  private score = 0;
  private scoreCoin!: Phaser.GameObjects.Image;
  private distance!: Phaser.GameObjects.Text;
  private distanceTracked = 0;
  private timer!: Phaser.Time.TimerEvent;
  private name = uuidv4();

  private isRunning = true;

  constructor() {
    super(SceneKeys.Game);
  }

  init() {
    this.score = 0;
    this.distanceTracked = 0;
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;

    //add background gradient
    this.background = this.add
      .tileSprite(0, 0, width, height, TextureKeys.Background)
      .setOrigin(0, 0)
      .setScrollFactor(0, 0);

    //add background decorations
    this.building1 = this.add
      .image(Phaser.Math.Between(900, 1500), 610, TextureKeys.Building1)
      .setOrigin(0.5, 1);

    this.building2 = this.add
      .image(Phaser.Math.Between(900, 1300), 610, TextureKeys.Building2)
      .setOrigin(0.5, 1);
    this.building3 = this.add
      .image(Phaser.Math.Between(1600, 2000), 610, TextureKeys.Building3)
      .setOrigin(0.5, 1);

    this.buildingsList = [this.building2, this.building3];

    this.building4 = this.add
      .image(Phaser.Math.Between(2200, 2700), 610, TextureKeys.Building4)
      .setOrigin(0.5, 1);
    this.building5 = this.add
      .image(Phaser.Math.Between(2900, 3200), 610, TextureKeys.Building5)
      .setOrigin(0.5, 1);

    this.buildings = [this.building4, this.building5];

    this.floor = this.add
      .tileSprite(0, 0, width, height, TextureKeys.Floor)
      .setOrigin(0, 0)
      .setScrollFactor(0, 0);

    //add background animated stars
    this.add
      .sprite(Phaser.Math.Between(50, 100), 100, TextureKeys.Star)
      .playReverse(AnimationKeys.Star)
      .setScrollFactor(0, 0)
      .setScale(3, 3);
    this.add
      .sprite(Phaser.Math.Between(200, 300), 50, TextureKeys.Star)
      .playAfterDelay(AnimationKeys.Star, 500)
      .setScrollFactor(0, 0)
      .setScale(1.5, 1.5);
    this.add
      .sprite(Phaser.Math.Between(600, 750), 75, TextureKeys.Star)
      .play(AnimationKeys.Star)
      .setScrollFactor(0, 0)
      .setScale(1.5, 1.5);
    this.add
      .sprite(Phaser.Math.Between(400, 600), 120, TextureKeys.Star)
      .playReverse(AnimationKeys.Star)
      .setScrollFactor(0, 0)
      .setScale(2, 2);

    //add clouds + delay scroll speed
    this.cloud1 = this.add
      .image(Phaser.Math.Between(1100, 1300), 200, TextureKeys.Cloud1)
      .setScrollFactor(0.5, 0);
    this.cloud2 = this.add
      .image(Phaser.Math.Between(200, 1000), 150, TextureKeys.Cloud2)
      .setScrollFactor(0.5, 0);
    this.cloud3 = this.add
      .image(Phaser.Math.Between(1000, 1500), 95, TextureKeys.Cloud3)
      .setScrollFactor(0.55, 0);

    //add obstacles
    this.laserObstacle = new LaserObstacle(this, 900, 100);
    this.add.existing(this.laserObstacle);

    //add collectibles
    this.coins = this.physics.add.staticGroup();
    this.gems = this.physics.add.staticGroup();

    //add player sprite
    this.gameSprite = new GameSprite(this, width * 0.3, height - 30);
    this.add.existing(this.gameSprite);

    const body = this.gameSprite.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setVelocityX(200);

    //animated cat in foreground
    this.cat = this.add
      .sprite(Phaser.Math.Between(200, 700), 550, TextureKeys.Cat)
      .play(AnimationKeys.Cat)
      .setOrigin(0, 0)
      .setScale(2.5, 2.5);

    //detect overlap between player and interactive objects
    this.physics.add.overlap(
      this.laserObstacle,
      this.gameSprite,
      this.handleOverlapLaser,
      undefined,
      this
    );
    this.physics.add.overlap(
      this.coins,
      this.gameSprite,
      this.handleCollectCoin,
      undefined,
      this
    );
    this.physics.add.overlap(
      this.gems,
      this.gameSprite,
      this.handleCollectGem,
      undefined,
      this
    );

    //world physics configs and camera movement
    this.physics.world.setBounds(0, 0, Number.MAX_SAFE_INTEGER, height - 55);

    this.cameras.main.startFollow(this.gameSprite);
    this.cameras.main.setBounds(0, 0, Number.MAX_SAFE_INTEGER, height);

    //scoreboard
    this.scoreCoin = this.add
      .image(35, 35, TextureKeys.Coin)
      .setScale(0.5, 0.5)
      .setScrollFactor(0, 0);

    this.scoreLabel = this.add
      .text(this.scoreCoin.width * 0.45, 6, `${this.score}`, {
        fontSize: "42px",
        strokeThickness: 2,
        color: "#FFFFFF",
        shadow: { fill: true, blur: 0, offsetY: 0 },
        padding: { left: 15, right: 15, top: 10, bottom: 10 },
      })
      .setScrollFactor(0);

    this.distance = this.add
      .text(0, 55, ``, {
        fontSize: "42px",
        strokeThickness: 2,
        color: "#FFFFFF",
        shadow: { fill: true, blur: 0, offsetY: 0 },
        padding: { left: 15, right: 15, top: 10, bottom: 10 },
      })
      .setScrollFactor(0, 0);
    this.timer = this.time.addEvent({ loop: true });
  }

  update(_t: number, _dt: number) {
    this.background.setTilePosition(this.cameras.main.scrollX);
    this.floor.setTilePosition(this.cameras.main.scrollX);
    this.wrapbuildingsList();
    this.wrapBuilding1();
    this.wrapBookcases();
    this.wrapClouds();
    this.wrapCat();
    this.wrapLaserObstacle();
    this.getTime();
    this.speedUp();
    // this.teleportBackwards();
  }

  private getTime() {
    this.distanceTracked = Math.round(this.timer.getElapsedSeconds() / 0.1);
    this.distance.setText(`${this.distanceTracked}m`);
  }

  private speedUp() {
    if (this.distanceTracked > 100 && this.isRunning === true) {
      const body = this.gameSprite.body as Phaser.Physics.Arcade.Body;
      body.setAccelerationX(25);
      body.setAllowDrag(true);
      body.setAccelerationY(-1000);
    }
  }

  private wrapBuilding1() {
    const scrollX = this.cameras.main.scrollX;
    const rightEdge = scrollX + this.scale.width;

    if (this.building1.x + this.building1.width < scrollX) {
      this.building1.x = Phaser.Math.Between(rightEdge + 300, rightEdge + 1000);
      this.spawnGems();

      const overlapBookcase = this.buildings.find((bc) => {
        return Math.abs(this.building1.x - bc.x) <= this.building1.width;
      });

      const overlapWindow = this.buildingsList.find((win) => {
        return Math.abs(this.building1.x - win.x) <= this.building1.width;
      });

      this.building1.visible = !overlapBookcase;
      this.building1.visible = !overlapWindow;
    }
  }

  private wrapbuildingsList() {
    const scrollX = this.cameras.main.scrollX;
    const rightEdge = scrollX + this.scale.width;

    let width = this.building2.width * 2;
    if (this.building2.x + width < scrollX) {
      this.building2.x = Phaser.Math.Between(
        rightEdge + width,
        rightEdge + width + 500
      );

      const overlap = this.buildings.find((bc) => {
        return Math.abs(this.building2.x - bc.x) <= this.building2.width;
      });

      this.building2.visible = !overlap;
    }

    width = this.building3.width;
    if (this.building3.x + width < scrollX) {
      this.building3.x = Phaser.Math.Between(
        this.building2.x + width,
        this.building2.x + width + 800
      );

      const overlap = this.buildings.find((bc) => {
        return Math.abs(this.building3.x - bc.x) <= this.building3.width;
      });

      this.building3.visible = !overlap;
    }
  }

  private wrapBookcases() {
    const scrollX = this.cameras.main.scrollX;
    const rightEdge = scrollX + this.scale.width;

    let width = this.building4.width * 2;
    if (this.building4.x + width < scrollX) {
      this.building4.x = Phaser.Math.Between(
        rightEdge + width,
        rightEdge + width + 800
      );

      const overlap = this.buildingsList.find((win) => {
        return Math.abs(this.building4.x - win.x) <= this.building4.width;
      });

      this.building4.visible = !overlap;
    }

    width = this.building5.width;
    if (this.building5.x + width < scrollX) {
      this.building5.x = Phaser.Math.Between(
        this.building4.x + width,
        this.building4.x + width + 800
      );
      const overlap = this.buildingsList.find((win) => {
        return Math.abs(this.building5.x - win.x) <= this.building5.width;
      });

      this.building5.visible = !overlap;
    }
  }

  private wrapClouds() {
    const scrollX = this.cameras.main.scrollX * 0.5;
    const rightEdge = scrollX + this.scale.width;

    let width = this.cloud1.width;
    if (this.cloud1.x + width < scrollX) {
      this.cloud1.x = Phaser.Math.Between(rightEdge + 100, rightEdge + 200);
    }

    width = this.cloud2.width;
    if (this.cloud2.x + width < scrollX) {
      this.cloud2.x = Phaser.Math.Between(rightEdge + 200, rightEdge + 400);
    }

    width = this.cloud3.width;
    if (this.cloud3.x + width < scrollX) {
      this.cloud3.x = Phaser.Math.Between(rightEdge + 400, rightEdge + 600);
    }
  }

  private wrapCat() {
    let scrollX = this.cameras.main.scrollX;
    let rightEdge = scrollX + this.scale.width;

    let width = this.cat.width;
    if (this.cat.x + width < scrollX) {
      this.cat.x = Phaser.Math.Between(rightEdge + 700, rightEdge + 1000);
      this.spawnCoins();
    }
  }

  private wrapLaserObstacle() {
    const scrollX = this.cameras.main.scrollX;
    const rightEdge = scrollX + this.scale.width;

    const body = this.laserObstacle.body as Phaser.Physics.Arcade.StaticBody;

    const width = body.width;

    if (this.laserObstacle.x + width < scrollX) {
      this.laserObstacle.x = Phaser.Math.Between(
        rightEdge + width,
        rightEdge + width + 1000
      );
      this.laserObstacle.y = Phaser.Math.Between(0, 300);

      body.position.x = this.laserObstacle.x + body.offset.x;
      body.position.y = this.laserObstacle.y + body.offset.y;
    }
  }

  private handleOverlapLaser(
    _obj1: Phaser.GameObjects.GameObject,
    obj2: Phaser.GameObjects.GameObject
  ) {
    const gameSprite = obj2 as GameSprite;
    gameSprite.kill();
    this.timer.paused = true;
    this.isRunning === false;
    this.timer.reset;

    if (this.score > Number(localStorage.getItem("gameHighscore"))) {
      localStorage.setItem("gameHighscore", String(this.score));
    }

    if (this.distanceTracked > Number(localStorage.getItem("maxDistance"))) {
      localStorage.setItem("maxDistance", String(this.distanceTracked));
    }

    const sendScore = () =>
      axios.get(
        `https://www.dreamlo.com/lb/vXHHcGCw6ECN3v8q2ewaOwDZuVTTox4UGp_eXTQHB91Q/add/${this.name}/${this.score}/${this.distanceTracked}`
      );

    sendScore();

    setTimeout(() => {
      this.scene.run(SceneKeys.GameOver, {
        score: this.score,
        distance: this.distanceTracked,
      });
      this.scene.stop(SceneKeys.Game);
    }, 1500);
  }

  private randomCoinFormation() {
    let formations = [100, 200, 300, 400];
    return formations[Math.floor(Math.random() * formations.length)];
  }

  private spawnCoins() {
    this.coins.children.each((child) => {
      const coin = child as Phaser.Physics.Arcade.Sprite;
      this.coins.killAndHide(coin);
      coin.body.enable = false;
    });

    const scrollX = this.cameras.main.scrollX;
    const rightEdge = scrollX + this.scale.width;

    let x = rightEdge + 100;

    const numCoins = Phaser.Math.Between(1, 15);

    for (let i = 0; i < numCoins; i++) {
      const coin = this.coins.get(
        x,
        this.randomCoinFormation(),
        TextureKeys.Coin
      ) as Phaser.Physics.Arcade.Sprite;

      coin
        .setVisible(true)
        .setActive(true)
        .play(AnimationKeys.Coins)
        .setScale(0.42);

      const body = coin.body as Phaser.Physics.Arcade.StaticBody;
      body.setCircle(body.width * 0.25);
      body.enable = true;
      body.updateFromGameObject();

      x += coin.width * 0.5;
    }
  }

  private handleCollectCoin(
    _obj1: Phaser.GameObjects.GameObject,
    obj2: Phaser.GameObjects.GameObject
  ) {
    const coin = obj2 as Phaser.Physics.Arcade.Sprite;

    this.score += 1;

    this.scoreLabel.text = `${this.score}`;

    this.coins.killAndHide(coin);

    coin.body.enable = false;
  }

  private randomGemFormation() {
    let formations = [150, 250, 350, 450];
    return formations[Math.floor(Math.random() * formations.length)];
  }

  private spawnGems() {
    this.gems.children.each((child) => {
      const gem = child as Phaser.Physics.Arcade.Sprite;
      this.coins.killAndHide(gem);
      gem.body.enable = false;
    });

    const scrollX = this.cameras.main.scrollX;
    const rightEdge = scrollX + this.scale.width;

    let x = rightEdge + 100;

    const numGems = Phaser.Math.Between(1, 2);

    for (let i = 0; i < numGems; i++) {
      const gem = this.gems.get(
        x,
        // Phaser.Math.Between(100, this.scale.height - 100),
        this.randomGemFormation(),
        TextureKeys.Gem
      ) as Phaser.Physics.Arcade.Sprite;

      gem
        .setVisible(true)
        .setActive(true)
        .play(AnimationKeys.Gem)
        .setScale(2.5, 2.5);

      const body = gem.body as Phaser.Physics.Arcade.StaticBody;
      body.setCircle(body.width * 0.5);
      body.enable = true;
      body.updateFromGameObject();

      x += gem.width * 3.5;
    }
  }

  private handleCollectGem(
    _obj1: Phaser.GameObjects.GameObject,
    obj2: Phaser.GameObjects.GameObject
  ) {
    const gem = obj2 as Phaser.Physics.Arcade.Sprite;

    this.score += 10;

    this.scoreLabel.text = `${this.score}`;

    this.gems.killAndHide(gem);

    gem.body.enable = false;
  }
}
