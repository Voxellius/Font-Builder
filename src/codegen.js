export const vxfTokens = {
    NUMBER_INT_8: byte("3"),
    NUMBER_INT_16: byte("4"),
    NUMBER_INT_32: byte("5"),
    STRING: byte("\""),
    PROPERTY: byte("P"),
    PROPERTY_SIZE: byte("S"),
    PROPERTY_BIT_DEPTH: byte("D"),
    PROPERTY_WEIGHT_LIGHT: byte("l"),
    PROPERTY_WEIGHT_MEDIUM: byte("m"),
    PROPERTY_WEIGHT_BOLD: byte("b"),
    PROPERTY_LETTERFORM_SANS_SERIF: byte("a"),
    PROPERTY_LETTERFORM_SERIF: byte("s"),
    PROPERTY_LETTERFORM_MONOSPACED: byte("o"),
    PROPERTY_LETTERFORM_HANDWRITING: byte("h"),
    PROPERTY_LETTERFORM_CURSIVE: byte("c"),
    PROPERTY_LETTERFORM_PICTOGRAPHIC: byte("p"),
    PROPERTY_ITALIC: byte("I"),
    PROPERTY_WRITING_DIRECTION_LEFT: byte("<"),
    PROPERTY_WRITING_DIRECTION_RIGHT: byte(">"),
    ENTER_GLYPH_MAP: byte("G")
};

export function byte(char) {
    return new TextEncoder().encode(char)[0] || 0x00;
}

export function bytes(...bytes) {
    return new Uint8Array(bytes);
}

export function join(...arrays) {
    return new Uint8Array(arrays.reduce((a, b) => [...a, ...b], []));
}

export function int8(value) {
    if (value < 0) {
        value = 0x100 + value;
    }

    return bytes(
        value & 0xFF
    );
}

export function int16(value) {
    if (value < 0) {
        value = 0x10000 + value;
    }

    return bytes(
        (value >> 8) & 0xFF,
        value & 0xFF
    );
}

export function int32(value) {
    if (value < 0) {
        value = 0x100000000 + value;
    }

    return bytes(
        (value >> 24) & 0xFF,
        (value >> 16) & 0xFF,
        (value >> 8) & 0xFF,
        value & 0xFF
    );
}

export function number(value) {
    if (value % 1 != 0) {
        var floatArray = new Float32Array(1).fill(value);

        return join(
            byte("%"),
            new Uint8Array(floatArray.buffer)
        );
    }

    var magnitude = Math.abs(value);

    if (magnitude <= 0x7F) {
        return join(bytes(vxfTokens.NUMBER_INT_8), int8(value));
    }

    if (magnitude <= 0x7FFF) {
        return join(bytes(vxfTokens.NUMBER_INT_16), int16(value));
    }

    return join(bytes(vxfTokens.NUMBER_INT_32), int32(value));
}

export function string(value) {
    return join(
        bytes(vxfTokens.STRING),
        new TextEncoder().encode(value),
        bytes(0x00)
    );
}