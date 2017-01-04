/*******************************************************************
 *                                                                 *
 * Few Things To Declare First:                                    *
 *      1. This seems not working with firefox. (Chrome tested)    *
 *      2. Style settings should be in css file, which need        *
 *         to install package.                                     *
 *      3. This can be much more clear and shorter when            *
 *         putting Mosaic class into a separate file.              *
 *      4. Target place for puting svg tiles can be passed         *
 *         as incoming argument. In this file, I chose certain     *
 *         location for purpose.                                   *
 *      5. For faster rendering, image size is constrained         *
 *         less than 800 * 600. Which can be modified in future.   *
 *      6. For not crashing browser, tile width and height are     *
 *         constraned to be greater than or equal to 4.            *
 *                                                                 *
 *******************************************************************/

IMG_WIDTH = 800;
IMG_HEIGHT = 600;


// Actions upon loading page
window.onload = function(){
    setStyle();

    // enable drag and drop
    dragDrop(); 
}


// some style settings
function setStyle(){
    document.getElementById('converter').style.visibility = 'hidden';
    
    // get drop zone
    var dropBox =  document.getElementById('dropbox');

    // change css style
    dropBox.className = 'drop'
    dropBox.style.border = '3px dashed #d3d5d4';
    dropBox.style.height = '100px';
    dropBox.style.width = '65%';
    dropBox.style.minWidth = '320px';
    dropBox.style.lineHeight = '100px';
    dropBox.style.textAlign = 'center';
    dropBox.style.color = '#d3d5d4';  
}


/*********************************** Load File Button ***********************************/

function loadImg(e){
    var file = e.target.files[0];

    var reader = new FileReader();
    reader.onload = function () {
        document.getElementById('img-orig').src = reader.result;
    }

    if (file){
        reader.readAsDataURL(file);
        document.getElementById('converter').style.visibility = 'visible';
    }
}


/*********************************** Drag and Drop ***********************************/

function dragDrop(){
    var dropBox = document.getElementById('dropbox');

    // drag over handler
    dropBox.addEventListener('dragover', function(e) {
        handleDragover(e);
    });

    // get file data on drop
    dropBox.addEventListener('drop', function(e) {
        handleDrop(e);
    });
}


// Dragover function
function handleDragover(evt){
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy';
}

// Drop function
function handleDrop(evt){
    evt.stopPropagation();
    evt.preventDefault();
    
    var file = evt.dataTransfer.files[0];
    
    // accept image type files
    if (file.type.match(/image.*/)) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var img = document.getElementById('img-orig');
            img.src= e.target.result;
        }

        // start reading the file data
        reader.readAsDataURL(file); 
        document.getElementById('converter').style.visibility = 'visible';
    }
}


/*********************************** Masaic ***********************************/

// Function for 'mosaictizing' 
function doMosaic(e){
    // check if tile setting are valid. Do nothing if not
    if(TILE_WIDTH < 1 || TILE_HEIGHT < 1){
        console.error('Invalid TILE size.')
        return
    }

    // get image
    var img = document.getElementById('img-orig');

    // initialize mosaic instance
    var m = new Mosaic(img, e);

    // initialize position of mosaic
    m.initMosaic();

    // produce mosaic
    m.mosaic();  
}


/*********************************** Mosaic Class ***********************************/

// Constructor
var Mosaic = function(img, e){
    // make sure 'this' points to correct place
    if (!(this instanceof Mosaic))
        return new Mosaic(img, e);

    // initialize settings
    this.img = img;
    this.e = e;

    this.width = this.img.width; //> IMG_WIDTH ? IMG_WIDTH : this.img.width;
    this.height = this.img.height; //> IMG_HEIGHT ? IMG_HEIGHT : this.img.height;
    
    // row that needs to be render
    this.DISPLAY_ROW_ID = 0;
    
    this.numOfTilesPerRow = Math.ceil(this.width / TILE_WIDTH);
    this.numOfTilesPerColumn = Math.ceil(this.height / TILE_HEIGHT);

    // get pixels using canvas
    var canvas = document.createElement('canvas');
    this.pixels = canvas.getContext('2d');
    canvas.width = this.width;
    canvas.height = this.height;

    // get pixels from image
    this.pixels.drawImage(img, 0, 0);
}


// Mosaic function for looping from top to bottom
Mosaic.prototype.mosaic = function(){
    for(var j = 0; j < this.height; j += TILE_HEIGHT){
        this.processRow(j);  
    }
}


// Process action in a row
Mosaic.prototype.processRow = function(j) {
    var rowID = Math.floor(j / TILE_HEIGHT);

    for(var i = 0; i < this.width; i += TILE_WIDTH){
        var currentRow = getRowID(rowID);
        
        // find valid size for tiles
        var w = this.getSizeW(i);
        var h = this.getSizeH(j);
        var tileSize = Math.floor(w * h);
        
        // find pixels of tile position in image
        var currentTile = this.pixels.getImageData(i, j, w, h).data;
        
        // compute mean color in the current tile
        var meanColor = getMeanColor(currentTile, tileSize);

        // fetch color and update mosaic using responsed color
        var url = './color/' + rgb2Hex(meanColor[0], meanColor[1], meanColor[2]);

        // pass 'this' for correct referencing
        this.fetch(url, this.update, currentRow, this);
    }
}


// Function for initialize place for rendering mosaic
Mosaic.prototype.initMosaic = function() {
    // Change button status upon clicking avoiding conflicts
    changeButtonStatus(this.e, true);

    var mosaicDiv = document.getElementById('mosaic');

    // initialize empty elements
    mosaicDiv.innerHTML = '';

    // create empty rows for mosaic
    for(var i = 0; i < this.numOfTilesPerColumn; i++){
        var row = document.createElement('div');
        
        // give id for each row
        row.id = getRowID(i);
        row.className = getRowID('');
        
        // eliminate white space between rows
        row.style.height = TILE_HEIGHT + 'px';
        
        // hide rows upon initializing
        row.style.visibility = 'hidden';
        
        // append to mosaic
        mosaicDiv.appendChild(row);
    }
}


// Fuction for handling asynchronous requests
Mosaic.prototype.fetch = function(url, update, currentRow, self) {
    var xhttp;

    // handle old version browsers
    if (window.XMLHttpRequest) {
        xhttp = new XMLHttpRequest();
    } else {
        xhttp = new ActiveXObject('MSXML2.XMLHTTP.3.0');
    }

    // handle when response.
    xhttp.onreadystatechange = function() {
        if (xhttp.readyState === 4 && xhttp.status === 200)
            update(xhttp, currentRow, self);    // update when responds are ready    
    };

    xhttp.open('GET', url, true);
    xhttp.send();
}


// Update tiles in mosaic. Using 'self' for correct referencing this
Mosaic.prototype.update = function(xhttp, currentRow, self) {
    var res = xhttp.responseText; 

    // if response is null, do nothing
    if(res != null){
        var row = document.getElementById(currentRow);
        
        // append responsed tile into current row (a.k.a append child)
        row.innerHTML += res;
        
        // display entire row if completed, otherwise, do nothing
        self.display();

        // check if rendering process completed. If so, change button back
        if(self.isRenderComplete())
            changeButtonStatus(self.e, false);
    }   
}


// Render an entire row if possible
Mosaic.prototype.display = function() { 
    var displayRowID = getRowID(this.DISPLAY_ROW_ID);
    var displayRow = document.getElementById(displayRowID);
    var children = displayRow.childNodes;

    // if not completed, do nothing
    if(children.length === this.numOfTilesPerRow){
        displayRow.style.visibility = 'visible';
        this.DISPLAY_ROW_ID++;
    }
}


// Check if rendering process if finished
Mosaic.prototype.isRenderComplete = function() { 
    if (this.DISPLAY_ROW_ID === this.numOfTilesPerColumn)
        return true;
    return false;
}


// Constrain tiles to correct width
Mosaic.prototype.getSizeW = function(i) {   
    if(i + TILE_WIDTH < this.width)
        return TILE_WIDTH;
    return this.width - i;
}


// Constrain tiles to correct height
Mosaic.prototype.getSizeH = function(j) {
    if(j + TILE_HEIGHT < this.height)
        return TILE_HEIGHT;
    return this.height - j;
}


/************************************* Utils *************************************/

// Compute mean color in tile given tile size
function getMeanColor(currentTile, tileSize){
    var rSum = 0, gSum = 0, bSum = 0, aSum = 0;

    // compute sum for all colors (r,g,b)
    var idx;
    for(var k = 0; k < tileSize; k++){
        // pixel array (canvas) is 1D array of r, g, b, a
        idx = k * 4;
        rSum += currentTile[idx];
        gSum += currentTile[idx + 1];
        bSum += currentTile[idx + 2];
    }

    // compute averages for r, g, b
    var rMean = 1.0 * rSum / tileSize;
    var gMean = 1.0 * gSum / tileSize;
    var bMean = 1.0 * bSum / tileSize;

    return Array(rMean, gMean, bMean);
}


// Change button status for avoiding conficts
function changeButtonStatus(event, disabled){
    var target = event.target;
    target.disabled = disabled;

    // showing status to user
    if(disabled)
        target.innerHTML = 'Mosaicing...';
    else
        target.innerHTML = 'Mosaic It';
}


// Get row id given index
function getRowID(idx){
    return 'row' + idx;
}

// Coversion betweem rgb to hex
function rgb2Hex(r, g, b){
    return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1, 7);
}
