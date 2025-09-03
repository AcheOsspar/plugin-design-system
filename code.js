"use strict";
// Muestra la interfaz de usuario del plugin.
figma.showUI(__html__, { width: 240, height: 220 });
// Escucha los mensajes que vienen desde la 'ui.html'.
figma.ui.onmessage = (msg) => {
    if (msg.type === 'create-variables') {
        const selection = figma.currentPage.selection;
        let createdCount = 0;
        if (selection.length === 0) {
            figma.notify("⚠️ Por favor, selecciona al menos un grupo.", { error: true });
            return; // Usamos return para no cerrar el plugin en caso de error
        }
        for (const node of selection) {
            if ("children" in node) {
                const textNode = node.findOne(n => n.type === "TEXT");
                const shapeNode = node.findOne(n => "fills" in n && Array.isArray(n.fills) && n.fills.length > 0);
                if (textNode && shapeNode) {
                    const textContent = textNode.characters;
                    const parts = textContent.split(' - ');
                    if (parts.length === 2) {
                        const styleName = parts[1].trim();
                        const colorFill = shapeNode.fills[0];
                        if (colorFill.type === 'SOLID') {
                            const style = figma.createPaintStyle();
                            style.name = styleName;
                            style.paints = [{ type: 'SOLID', color: colorFill.color }];
                            createdCount++;
                        }
                    }
                }
            }
        }
        if (createdCount > 0) {
            figma.notify(`✅ ¡Se crearon ${createdCount} estilos de color!`);
        }
        else {
            figma.notify("🤔 No se encontraron grupos válidos en tu selección.", { error: true });
        }
        // figma.closePlugin(); // <-- HEMOS COMENTADO ESTA LÍNEA
    }
};
