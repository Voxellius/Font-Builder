import * as codeGen from "./codegen.js";

export class Glyph {
    constructor(font, characters, width) {
        this.font = font;
        this.characters = characters;
        this.width = width;
        this.values = new Uint8Array(width * font.size).fill(0);
    }

    get characterLength() {
        return new TextEncoder().encode(this.characters).length;
    }

    getPixel(x, y) {
        return this.values[(y * this.width) + x];
    }

    setPixel(x, y, value) {
        return this.values[(y * this.width) + x] = value;
    }

    encodeBitmap() {
        var currentValue = this.font.bitDepth == 1 ? 0 : null;
        var values = this.font.bitDepth == 1 ? [0] : [];
        var counts = this.font.bitDepth == 1 ? [0] : [];

        for (var x = 0; x < this.width; x++) {
            for (var y = 0; y < this.font.size; y++) {
                var value = this.getPixel(x, y);

                if (value != currentValue) {
                    currentValue = value;

                    values.push(value);
                    counts.push(0);
                }

                counts[counts.length - 1]++;

                if (counts[counts.length - 1] == 255) {
                    currentValue = this.font.bitDepth == 1 ? 255 - value : null
                }
            }
        }

        if (this.font.bitDepth == 1) {
            return codeGen.join(codeGen.number(values.length), codeGen.bytes(...counts));
        }

        return codeGen.join(codeGen.number(values.length), ...values.map((value, i) => codeGen.bytes(value, counts[i])));
    }

    encode() {
        return codeGen.join(codeGen.string(this.characters), this.encodeBitmap());
    }
}

export class Font {
    constructor(size, bitDepth = 1) {
        this.size = size;
        this.bitDepth = bitDepth;
        this.weight = "medium";
        this.letterform = "sansSerif";
        this.italic = false;
        this.writingDirection = "right";
        this.glyphs = [];
    }

    encodeProperties() {
        return codeGen.join(
            codeGen.bytes(codeGen.vxfTokens.PROPERTY_SIZE, this.size),
            codeGen.bytes(codeGen.vxfTokens.PROPERTY_BIT_DEPTH, this.bitDepth),
            codeGen.bytes({
                "light": codeGen.vxfTokens.PROPERTY_WEIGHT_LIGHT,
                "bold": codeGen.vxfTokens.PROPERTY_WEIGHT_BOLD
            }[this.weight] || codeGen.vxfTokens.PROPERTY_WEIGHT_MEDIUM),
            codeGen.bytes({
                "serif": codeGen.vxfTokens.PROPERTY_LETTERFORM_SERIF,
                "monospaced": codeGen.vxfTokens.PROPERTY_LETTERFORM_MONOSPACED,
                "handwriting": codeGen.vxfTokens.PROPERTY_LETTERFORM_HANDWRITING,
                "cursive": codeGen.vxfTokens.PROPERTY_LETTERFORM_CURSIVE
            }[this.letterform] || codeGen.vxfTokens.PROPERTY_LETTERFORM_SANS_SERIF),
            this.italic ? codeGen.bytes(codeGen.vxfTokens.PROPERTY_ITALIC) : codeGen.bytes(),
            codeGen.bytes({
                "right": codeGen.vxfTokens.PROPERTY_WRITING_DIRECTION_RIGHT
            }[this.writingDirection] || codeGen.vxfTokens.PROPERTY_WRITING_DIRECTION_LEFT)
        );
    }

    encodeGlyphs() {
        var sortedGlyphs = this.glyphs.sort((a, b) => b.characterLength - a.characterLength); // Longest strings of characters first

        return codeGen.join(...sortedGlyphs.map((glyph) => glyph.encode()));
    }

    encode() {
        return codeGen.join(
            codeGen.bytes(codeGen.byte("V"), codeGen.byte("x"), codeGen.byte("F"), 1),
            this.encodeProperties(),
            this.encodeGlyphs(),
            codeGen.bytes(0)
        );
    }
}