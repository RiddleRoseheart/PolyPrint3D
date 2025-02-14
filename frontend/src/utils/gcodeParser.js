export class GCodeParser {
    constructor() {
        this.position = { x: 0, y: 0, z: 0, e: 0 };
        this.paths = [];
        this.currentPath = [];
        this.layerHeight = 0;
        this.isExtruding = false;
    }

    parseGCode(gcode) {
        const lines = gcode.split('\n');
        let layerData = {
            paths: [],
            moves: [],
            layerHeight: 0,
            extrusions: []
        };

        lines.forEach(line => {
            line = line.trim().toUpperCase();
            if (line.startsWith(';') || line.length === 0) return;

            const commands = this.parseLine(line);
            if (commands) {
                this.processCommands(commands, layerData);
            }
        });

        return layerData;
    }

    parseLine(line) {
        const commands = {};
        const parts = line.split(' ');
        
        parts.forEach(part => {
            if (part.length > 1) {
                const code = part.charAt(0);
                const value = parseFloat(part.slice(1));
                if (!isNaN(value)) {
                    commands[code] = value;
                }
            }
        });

        return commands;
    }

    processCommands(commands, layerData) {
        // Handle movement commands
        if ('G' in commands) {
            switch (commands.G) {
                case 0: // Rapid move
                case 1: // Linear move
                    this.handleMove(commands, layerData);
                    break;
                case 28: // Home
                    this.position = { x: 0, y: 0, z: 0, e: 0 };
                    break;
            }
        }

        // Layer change detection
        if ('Z' in commands && commands.Z !== this.position.z) {
            this.layerHeight = commands.Z;
            layerData.layerHeight = this.layerHeight;
            this.finishPath(layerData);
        }
    }

    handleMove(commands, layerData) {
        const newPosition = { ...this.position };
        let hasMove = false;

        // Update position
        ['X', 'Y', 'Z', 'E'].forEach(axis => {
            if (axis in commands) {
                newPosition[axis.toLowerCase()] = commands[axis];
                hasMove = true;
            }
        });

        if (!hasMove) return;

        // Detect extrusion
        const isExtruding = newPosition.e > this.position.e;
        
        // Store movement data
        if (isExtruding) {
            this.currentPath.push(
                this.position.x, this.position.y, this.position.z,
                newPosition.x, newPosition.y, newPosition.z
            );
            
            layerData.extrusions.push({
                start: { ...this.position },
                end: { ...newPosition },
                extrusionAmount: newPosition.e - this.position.e
            });
        } else {
            layerData.moves.push({
                start: { ...this.position },
                end: { ...newPosition }
            });
            
            this.finishPath(layerData);
        }

        this.position = newPosition;
    }

    finishPath(layerData) {
        if (this.currentPath.length > 0) {
            layerData.paths.push(new Float32Array(this.currentPath));
            this.currentPath = [];
        }
    }
}

