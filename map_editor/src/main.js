
const MAP_WIDTH  = 128
const MAP_HEIGHT  = 128

const GROUND_MAX_HEIGHT = 50;

const makeMappingString = (x, y) => { return (x + '-' + y) };

const EditScreen = function () {
    this.tiles = [];
    this.heights = []

    this.mapping = {};

    this.brushSize = 1;
    this.brushIndex = 0;

    this.isDraggingTopography = false;
    this.topographyDragSpot = { x: 0, y: 0};
    this.topographyReferenceHeight = 0;
};
EditScreen.prototype.init = function() {
  this.tiles = new Array(MAP_WIDTH);
  this.heights = new Array(MAP_WIDTH);
  for (let i = 0; i < MAP_WIDTH; i++) {
    this.tiles[i] = new Array(MAP_HEIGHT);
    this.heights[i] = new Array(MAP_HEIGHT);


    for (let j = 0; j < MAP_HEIGHT; j++) {
        this.tiles[i][j] = 0;
        this.heights[i][j] = 0;
    }
  }
};
EditScreen.prototype.preload = function() {
    this.load.spritesheet('test_tiles', '../doc/gimp/moon_geo.png', { frameWidth: 8, frameHeight: 8 });
};
EditScreen.prototype.clearTiles = function() {
    for (let i = 0; i < MAP_WIDTH; i++) {
        for (let j = 0; j < MAP_HEIGHT; j++) {
            this.tiles[i][j] = 0;
            this.heights[i][j] = 0x00;
        }
    }
};
EditScreen.prototype.refreshTile = function(x, y, value) {
    const mapstring = makeMappingString(x, y);

    // this.mapping[mapstring].setFrame(value);
    this.tiles[x][y] = value & 0xFF;
};

EditScreen.prototype.saveMapToBinary = function() {
    const output = new ArrayBuffer(MAP_WIDTH * MAP_HEIGHT);
    const view = new Uint8ClampedArray(output);

    for (let i = 0; i < MAP_WIDTH; i++) {
        for (let j = 0; j < MAP_HEIGHT; j++) {
            const index = i + (j * MAP_WIDTH);

            view.set([this.tiles[i][j] & 0xFF], index);
        }
    }

    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";

    const name = 'map.bin'
    var blob = new Blob([view], {type: "application/octet-stream"});
    var url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = name;
    a.click();
    window.URL.revokeObjectURL(url);
};

EditScreen.prototype.saveHeightToBinary = function() {
    const output = new ArrayBuffer(MAP_WIDTH * MAP_HEIGHT);
    const view = new Uint8ClampedArray(output);

    for (let i = 0; i < MAP_WIDTH; i++) {
        for (let j = 0; j < MAP_HEIGHT; j++) {
            const index = i + (j * MAP_WIDTH);

            view.set([this.heights[i][j] & 0xFF], index);
        }
    }

    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";

    const name = 'height.bin'
    var blob = new Blob([view], {type: "application/octet-stream"});
    var url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = name;
    a.click();
    window.URL.revokeObjectURL(url);
};


EditScreen.prototype.setup3D = function() {
    this.three = {};

    this.three.camera = new THREE.PerspectiveCamera( 60, this.game.canvas.width / this.game.canvas.height,  0.1, 1000 );
    // this.three.camera = new THREE.OrthographicCamera( this.game.canvas.width / - 2, this.game.canvas.width / 2, this.game.canvas.height / 2, this.game.canvas.height / - 2, 1, 1000 );

    this.three.scene = new THREE.Scene();
    this.three.renderer = new THREE.WebGLRenderer( { canvas: this.game.canvas, context: this.game.context, antialias: false } );
    this.three.renderer.autoClear = true;
    this.three.renderer.setClearColor(new THREE.Color(0x330044), 1.0);

    this.three.controls = new THREE.OrbitControls( this.three.camera, this.three.renderer.domElement );
    this.three.controls.enabled = false;

    this.three.raycaster = new THREE.Raycaster(undefined, undefined, 0.1, 200);

    this.three.view = this.add.extern();
    const that = this;
    this.three.view.render = function (prenderer, pcamera, pcalcMatrix) {
        that.three.renderer.state.reset();
        that.three.renderer.render(that.three.scene, that.three.camera);
    }
};
EditScreen.prototype.sampleHeight = function (x, y) {
    x = (~~(x));
    y = (~~(y));
    x = (x + MAP_WIDTH) % MAP_WIDTH;
    y = (y + MAP_HEIGHT) % MAP_HEIGHT;

    return ~~(this.heights[x][y]) & 0xFF;
};
EditScreen.prototype.updateGeoFromHeights = function () {
    for (let i = 0; i < MAP_WIDTH; i++) {
        for (let j = 0; j < MAP_HEIGHT; j++) {
            const mid = this.sampleHeight(i, j);
            const n = this.sampleHeight(i, j-1);
            const s = this.sampleHeight(i, j+1);
            const e = this.sampleHeight(i+1, j);
            const w = this.sampleHeight(i-1, j);
            const ne = this.sampleHeight(i+1, j-1);
            const se = this.sampleHeight(i+1, j+1);
            const nw = this.sampleHeight(i-1, j-1);
            const sw = this.sampleHeight(i-1, j+1);
            const heightA = (((nw + n + mid + w) * 0.25));
            const heightB = (((n + ne + e + mid) * 0.25));
            const heightC = (((mid + e + se + s) * 0.25));
            const heightD = (((w + mid + s + sw) * 0.25));

            this.groundGeo.vertices[i + (j * 129)].z = (heightA / 255) * GROUND_MAX_HEIGHT;
            this.groundGeo.vertices[i + (j * 129) + 1].z = (heightB / 255) * GROUND_MAX_HEIGHT;
            this.groundGeo.vertices[i + (j * 129) + 129].z = (heightC / 255) * GROUND_MAX_HEIGHT;
            this.groundGeo.vertices[i + (j * 129) + 129 + 1].z = (heightD / 255) * GROUND_MAX_HEIGHT;
        }
    }
    this.groundGeo.verticesNeedUpdate = true;
};
EditScreen.prototype.setupScene = function() {
    this.groundMeshes = {};
    const groundMat = new THREE.MeshBasicMaterial( { wireframe: true, color: 0x00FF00 } );
    const groundGeo = new THREE.PlaneGeometry( MAP_WIDTH, MAP_HEIGHT, MAP_WIDTH, MAP_HEIGHT);
    const groundMesh = new THREE.Mesh( groundGeo, groundMat);
    this.three.scene.add(groundMesh);
    this.groundGeo = groundGeo;

    this.three.camera.position.set(0, -50, 70);
    this.three.camera.lookAt(0, 0, 0);

    this.updateGeoFromHeights();
};

function clamp(num, min, max) {
  return num <= min ? min : num >= max ? max : num;
}

const threeMouseCoordsVector = new THREE.Vector2(0, 0);
const arrayRaycastResults = [];
EditScreen.prototype.create = function() {


    this.isDraggingTopography = false;
    this.topographyDragSpot = { x: 0, y: 0};

    this.mapping = {};
    this.clearTiles();

    this.setup3D();
    this.setupScene();

    const brushTest = this.add.text(128 * 4, 32, 'brush index: 1', { color: 'white', font: 'monospace' });
    brushTest.displayOriginX = 0.5;
    brushTest.displayOriginY = 0.5;

    this.controlsKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);

    const saveKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    saveKey.on('down', () => {
        this.saveMapToBinary();
        this.saveHeightToBinary();
    });

    const zeroKey = 48;
    const shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    for (let i = 0; i < 8; i++) {
        const key = this.input.keyboard.addKey(zeroKey + i + 1);
        const b = i;
        key.on('down', () => {
            let ind = b;
            if (shiftKey.isDown) {
                ind += 8;
            }
            this.brushIndex = ind & 0xFF;
            brushTest.text = 'brush index: ' + (ind + 1);
        })
    }
    for (let i = 0; i < MAP_WIDTH; i++) {
        for (let j = 0; j < MAP_HEIGHT; j++) {
            // const s = this.add.image(i * 4, j * 4, 'test_tiles', 0);
            // s.displayOriginX = 0;
            // s.displayOriginY = 0;
            // s.scaleX = 0.5;
            // s.scaleY = 0.5

            // this.mapping[makeMappingString(i, j)] = s;
        }
    }

    this.input.on('pointermove', (pointer) => {
        // Painting on 2D map
        if (pointer.isDown) {
            if (pointer.x < (128 * 4)) {
                const scopedX = ~~((pointer.x) / 4.0);
                const scopedY = ~~((pointer.y) / 4.0);
                this.refreshTile(scopedX, scopedY, this.brushIndex);
            }
        }

        if (this.isDraggingTopography) {
            const verticalDelta = (pointer.downY - pointer.y);
            this.heights[this.topographyDragSpot.x][this.topographyDragSpot.y] = ~~(clamp( this.topographyReferenceHeight + verticalDelta, 0, 255)) & 0xff;
            this.updateGeoFromHeights();
        }
    });

    this.input.on('pointerdown', (pointer) => {
        this.isDraggingTopography = false;
        arrayRaycastResults.length = 0;
        const mouseX = pointer.x / this.game.canvas.width;
        const mouseY = 1.0 - (pointer.y / this.game.canvas.height);
        threeMouseCoordsVector.x = (mouseX * 2.0) - 1.0;
        threeMouseCoordsVector.y = (mouseY * 2.0) - 1.0;
        this.three.raycaster.setFromCamera(threeMouseCoordsVector, this.three.camera);
        this.three.raycaster.intersectObjects(this.three.scene.children, false, arrayRaycastResults);
        if ((arrayRaycastResults.length > 0)) {
            // There should be nothing else in the scene
            const intersectPoint = arrayRaycastResults[0].point;

            this.topographyDragSpot.x = ~~((intersectPoint.x + 64));
            this.topographyDragSpot.y = ~~(Math.abs(intersectPoint.y - 64));
            console.log(this.topographyDragSpot.x + ' , ' + this.topographyDragSpot.y)
            this.isDraggingTopography = true;
            this.topographyReferenceHeight = this.heights[this.topographyDragSpot.x][this.topographyDragSpot.y];
        }
    });

    this.input.on('pointerup', (pointer) => {
        this.isDraggingTopography = false;

        console.log(this.heights);
    });
};
EditScreen.prototype.update = function() {
    this.three.controls.enabled = this.controlsKey.isDown;
};

const main = function() {
    let game = new Phaser.Game({
        width: 640 * 2,
        height: 4 * 128,
        type : Phaser.WEBGL,
        pixelArt: true,
        antialias: false,
        scaleMode: Phaser.Scale.ScaleModes.FIT,
        autoCenter: Phaser.Scale.Center.CENTER_BOTH,
        roundPixels: true,
        input: {
            gamepad: true
        },
        plugins: {
            global: [],
        }
     });

    game.scene.add('EditScreen', EditScreen, true);
};