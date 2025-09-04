"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
figma.showUI(__html__, { width: 260, height: 220 });
(() => __awaiter(void 0, void 0, void 0, function* () {
    const total = (yield figma.clientStorage.getAsync('totalCreatedCount')) || 0;
    figma.ui.postMessage({ type: 'update-count', count: total });
}))();
figma.ui.onmessage = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    if (msg.type === 'create-styles') {
        const selection = figma.currentPage.selection;
        let createdCount = 0;
        let skippedCount = 0;
        if (selection.length === 0) {
            figma.notify("⚠️ Por favor, selecciona al menos un grupo.", { error: true });
            return;
        }
        const existingStyles = figma.getLocalPaintStyles();
        const existingStyleNames = new Set(existingStyles.map(style => style.name));
        const currentTotal = (yield figma.clientStorage.getAsync('totalCreatedCount')) || 0;
        for (const node of selection) {
            if ("children" in node) {
                const textNode = node.findOne(n => n.type === "TEXT");
                const shapeNode = node.findOne(n => "fills" in n && Array.isArray(n.fills) && n.fills.length > 0);
                if (textNode && shapeNode) {
                    // --- NUEVA LÓGICA DE PARSEO ---
                    const cssVariableName = textNode.characters.trim();
                    // Solo procesamos si el texto parece una variable CSS
                    if (cssVariableName.startsWith('--')) {
                        const figmaStyleName = cssVariableName
                            .substring(2) // Quita el '--'
                            .split('-') // Divide por guiones
                            .map(part => part.charAt(0).toUpperCase() + part.slice(1)) // Pone en mayúscula cada parte
                            .join('/'); // Une con '/'
                        if (existingStyleNames.has(figmaStyleName)) {
                            skippedCount++;
                        }
                        else {
                            const colorFill = shapeNode.fills[0];
                            if (colorFill.type === 'SOLID') {
                                const style = figma.createPaintStyle();
                                style.name = figmaStyleName;
                                style.paints = [{ type: 'SOLID', color: colorFill.color }];
                                createdCount++;
                                existingStyleNames.add(figmaStyleName);
                            }
                        }
                    }
                }
            }
        }
        // El feedback se mantiene igual, ¡pero ahora es más potente!
        let feedbackMessage = "";
        if (createdCount > 0) {
            feedbackMessage += `✅ ${createdCount} estilos creados. `;
        }
        if (skippedCount > 0) {
            feedbackMessage += `⚠️ ${skippedCount} ya existían.`;
        }
        if (createdCount === 0 && skippedCount === 0) {
            feedbackMessage = "🤔 No se encontraron grupos con formato de variable CSS válido (--ejemplo-de-nombre).";
        }
        figma.notify(feedbackMessage.trim(), { timeout: 3000 }); // Aumentamos el tiempo del mensaje
        const newTotal = currentTotal + createdCount;
        yield figma.clientStorage.setAsync('totalCreatedCount', newTotal);
        figma.ui.postMessage({ type: 'update-count', count: newTotal });
    }
});
