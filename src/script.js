import * as opentype from "/lib/opentype.mjs";

var font = null;
var fontSize = 16;
var fontBitDepth = 1;
var fontThreshold = 0;
var fontHeightAbove = 0;
var webFont = null;

function createGlyphItem(characters, drawImportedCharacters = false) {
    var element = document.createElement("div");
    var characterInputContainer = document.createElement("div");
    var characterInput = document.createElement("input");
    var canvas = document.createElement("canvas");
    var context = canvas.getContext("2d");

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

    element.normaliseBitmap = function(initial = false) {
        var imageData = element.getImageData();

        if (imageData == null) {
            return;
        }

        for (var i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i + 0] = 0;
            imageData.data[i + 1] = 0;
            imageData.data[i + 2] = 0;
            imageData.data[i + 3] = Math.round((imageData.data[i + 3] + fontThreshold) / (255 / fontBitDepth)) * (255 / fontBitDepth);
        }

        canvas.width = canvas.width;
        context.putImageData(imageData, 0, 0);
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

    document.querySelector(".glyphs").append(element);

    return element;
}

async function loadFont(file) {
    var data = await file.arrayBuffer();

    font = opentype.parse(data, {lowMemory: true});

    document.querySelector(".glyphs").innerHTML = "";

    for (var i = 0; i < font.numGlyphs; i++) {
        var glyph = font.glyphs.get(i);
        var glyphItem = createGlyphItem(String.fromCodePoint(...[glyph.unicodes]), true);
    }
}

window.addEventListener("load", function(event) {
    document.querySelector("#importButton").addEventListener("click", async function(event) {
        var file = document.querySelector("#importFileInput").files[0];

        fontSize = Number(document.querySelector("#importSize").value);
        fontBitDepth = Number(document.querySelector("#importBitDepth").value);
        fontThreshold = Number(document.querySelector("#importThreshold").value);
        fontHeightAbove = Number(document.querySelector("#importHeightAbove").value);

        if (webFont != null) {
            document.fonts.delete(webFont);
        }

        webFont = new FontFace("ImportedFont", `url("${URL.createObjectURL(file)}") format("truetype")`, {});

        await webFont.load();

        document.fonts.add(webFont);

        await loadFont(document.querySelector("#importFileInput").files[0]);
    });
});