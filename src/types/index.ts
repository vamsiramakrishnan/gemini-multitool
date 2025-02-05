export interface Widget {
    id: string;
    type: string; // e.g., 'text', 'weather', 'map'
    x: number;      // Column position (for initial layout)
    y: number;      // Row position (for initial layout)
    w: number;      // Width in columns (for initial layout)
    h: number;      // Height in rows (for initial layout)
    config: any;    // Widget-specific configuration data
}

export interface Layout {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    static?: boolean;
    isDraggable?: boolean;
    isResizable?: boolean;
}
