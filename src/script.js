import * as opentype from "/lib/opentype.mjs";

import * as vxf from "./vxf.js";

var font = null;
var fontSize = 16;
var fontBitDepth = 1;
var fontHighestValue = 1;
var fontThreshold = 0;
var fontHeightAbove = 0;
var webFont = null;

function createGlyphItem(characters, drawImportedCharacters = false) {
    var element = document.createElement("div");
    var characterInputContainer = document.createElement("div");
    var characterInput = document.createElement("input");
    var canvas = document.createElement("canvas");
    var context = canvas.getContext("2d", {willReadFrequently: true});
    var pointerIsDown = false;
    var isErasing = false;

    element.setWidth = function(width) {
        width = Math.ceil(width);

        canvas.width = width;

        canvas.style.width = `${width}px`;
    };

    element.getImageData = function() {
        if (canvas.width == 0 || canvas.height == 0) {
            return null;
        }

        return context.getImageData(0, 0, canvas.width, canvas.height);
    };

    element.normaliseBitmap = function() {
        var imageData = element.getImageData();

        if (imageData == null) {
            return;
        }

        for (var i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i + 0] = 0;
            imageData.data[i + 1] = 0;
            imageData.data[i + 2] = 0;
            imageData.data[i + 3] = Math.round((imageData.data[i + 3] + fontThreshold) / (255 / fontHighestValue)) * (255 / fontHighestValue);
        }

        canvas.width = canvas.width;
        context.putImageData(imageData, 0, 0);
    };

    element.setPixel = function(x, y, value = Number(document.querySelector("#drawValue").value)) {
        var pixel = context.createImageData(1, 1);

        pixel.data[0] = 0;
        pixel.data[1] = 0;
        pixel.data[2] = 0;
        pixel.data[3] = value * (255 / fontHighestValue);
        
        context.putImageData(pixel, x, y);
    };

    element.drawImportedFont = function(characters = characterInput.value) {
        context.textBaseline = "top";
        context.font = `${fontSize - fontHeightAbove}px ImportedFont`;
        
        element.setWidth(context.measureText(characters).width);

        context.textBaseline = "top";
        context.font = `${fontSize - fontHeightAbove}px ImportedFont`;

        context.fillText(characters, 0, fontHeightAbove);

        element.normaliseBitmap(true);
    };

    element.classList.add("glyph");
    characterInput.classList.add("glyphCharacterInput");

    characterInput.value = characters;

    canvas.width = Math.ceil(fontSize * (3 / 4));
    canvas.height = fontSize;

    characterInputContainer.append(characterInput);

    element.append(characterInputContainer);
    element.append(canvas);

    if (drawImportedCharacters) {
        element.drawImportedFont();

        if (canvas.width == 0) {
            return;
        }
    }

    canvas.addEventListener("pointerdown", function(event) {
        pointerIsDown = true;
        isErasing = event.button == 2;

        element.setPixel(
            Math.floor(event.offsetX / parseInt(getComputedStyle(canvas).zoom)),
            Math.floor(event.offsetY / parseInt(getComputedStyle(canvas).zoom)),
            isErasing ? 0 : undefined
        );

        event.preventDefault();
    });

    canvas.addEventListener("contextmenu", function(event) {
        event.preventDefault();
    });

    canvas.addEventListener("pointermove", function(event) {
        if (!pointerIsDown) {
            return;
        }

        element.setPixel(
            Math.floor(event.offsetX / parseInt(getComputedStyle(canvas).zoom)),
            Math.floor(event.offsetY / parseInt(getComputedStyle(canvas).zoom)),
            isErasing ? 0 : undefined
        );
    });

    canvas.addEventListener("pointerup", function() {
        pointerIsDown = false;
        isErasing = false;
    });

    document.querySelector(".glyphs").append(element);

    return element;
}

async function importFont(file) {
    var data = await file.arrayBuffer();

    font = opentype.parse(data, {lowMemory: true});

    document.querySelector(".glyphs").innerHTML = "";

    for (var i = 0; i < font.numGlyphs; i++) {
        var glyph = font.glyphs.get(i);
        var glyphItem = createGlyphItem(String.fromCodePoint(...[glyph.unicodes]), true);
    }
}

function generateFontData() {
    var fontStore = new vxf.Font(fontSize, fontBitDepth);

    document.querySelectorAll(".glyph").forEach(function(element) {
        var canvas = element.querySelector("canvas");
        var imageData = element.getImageData();
        
        var glyph = new vxf.Glyph(fontStore, element.querySelector(".glyphCharacterInput").value, canvas.width);

        for (var i = 0; i < imageData.data.length; i += 4) {
            glyph.values[i / 4] = imageData.data[i + 3];
        }

        fontStore.glyphs.push(glyph);
    });

    return fontStore;
}

window.addEventListener("load", function() {
    document.querySelector("#importButton").addEventListener("click", async function() {
        var file = document.querySelector("#importFileInput").files[0];

        fontSize = Number(document.querySelector("#importSize").value);
        fontBitDepth = Number(document.querySelector("#importBitDepth").value);
        fontHighestValue = 2 ** (fontBitDepth - 1);
        fontThreshold = Number(document.querySelector("#importThreshold").value);
        fontHeightAbove = Number(document.querySelector("#importHeightAbove").value);

        document.querySelector("#drawValue").max = fontHighestValue;

        if (webFont != null) {
            document.fonts.delete(webFont);
        }

        webFont = new FontFace("ImportedFont", `url("${URL.createObjectURL(file)}") format("truetype")`, {});

        await webFont.load();

        document.fonts.add(webFont);

        await importFont(document.querySelector("#importFileInput").files[0]);
    });

    document.querySelector("#saveButton").addEventListener("click", function() {
        var fontStore = generateFontData();
        var encodedData = fontStore.encode();

        console.log(fontStore, encodedData, new TextDecoder().decode(encodedData));
    });
});