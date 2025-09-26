// Mostramos la UI
figma.showUI(__html__, { width: 280, height: 220 });

// Enviamos el total guardado a la UI al iniciar
(async () => {
  const total = await figma.clientStorage.getAsync('totalCreatedCount') || 0;
  figma.ui.postMessage({ type: 'update-count', count: total });
})();

// Escuchamos mensajes desde la UI
figma.ui.onmessage = async (msg) => {
  switch (msg.type) {
    case 'create-styles':
      await createStyles();
      break;
    case 'export-css':
      await exportCss();
      break;
    case 'notify':
      figma.notify(msg.message, { error: msg.error || false });
      break;
  }
};

// --- LÓGICA PARA LA PESTAÑA "PARA DISEÑO" (Sin cambios) ---
async function createStyles() {
  const selection = figma.currentPage.selection;
  let createdCount = 0, skippedCount = 0;
  
  if (selection.length === 0) {
    figma.notify("⚠️ Por favor, selecciona grupos (forma + texto).", { error: true });
    return;
  }

  const existingStyles = figma.getLocalPaintStyles();
  const existingStyleNames = new Set(existingStyles.map(style => style.name));
  const currentTotal = await figma.clientStorage.getAsync('totalCreatedCount') || 0;

  for (const node of selection) {
    if ("children" in node) {
      const textNode = node.findOne(n => n.type === "TEXT") as TextNode;
      const shapeNode = node.findOne(n => "fills" in n && Array.isArray(n.fills) && n.fills.length > 0) as SceneNode & {fills: readonly Paint[]};

      if (textNode && shapeNode) {
        const cssVariableName = textNode.characters.trim();
        if (cssVariableName.startsWith('--')) {
          const figmaStyleName = cssVariableName.substring(2).split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('/');
          
          if (existingStyleNames.has(figmaStyleName)) {
            skippedCount++;
          } else {
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
  
  let feedbackMessage = "";
  if (createdCount > 0) { feedbackMessage += `✅ ${createdCount} estilos creados. `; }
  if (skippedCount > 0) { feedbackMessage += `⚠️ ${skippedCount} ya existían.`; }
  if (createdCount === 0 && skippedCount === 0) { feedbackMessage = "🤔 No se encontraron grupos válidos."; }
  figma.notify(feedbackMessage.trim());

  const newTotal = currentTotal + createdCount;
  await figma.clientStorage.setAsync('totalCreatedCount', newTotal);
  figma.ui.postMessage({ type: 'update-count', count: newTotal });
}

// --- LÓGICA PARA LA PESTAÑA "PARA DESARROLLO" (¡MODIFICADA!) ---
async function exportCss() {
  const selection = figma.currentPage.selection;
  const cssVariables = [];
  
  if (selection.length === 0) {
    figma.notify("⚠️ Por favor, selecciona al menos un grupo.", { error: true });
    return;
  }
  
  for (const node of selection) {
    // La lógica de búsqueda es la misma que en createStyles
    if ("children" in node) {
      const textNode = node.findOne(n => n.type === "TEXT") as TextNode;
      const shapeNode = node.findOne(n => "fills" in n && Array.isArray(n.fills) && n.fills.length > 0) as SceneNode & {fills: readonly Paint[]};

      if (textNode && shapeNode) {
        const cssVariableName = textNode.characters.trim();
        const colorFill = shapeNode.fills[0];

        if (cssVariableName.startsWith('--') && colorFill.type === 'SOLID') {
          const hexColor = rgbToHex(colorFill.color);
          cssVariables.push(`  ${cssVariableName}: ${hexColor};`);
        }
      }
    }
  }

  if (cssVariables.length > 0) {
    const cssString = `:root {\n${cssVariables.join('\n')}\n}`;
    figma.ui.postMessage({ type: 'css-to-clipboard', css: cssString });
  } else {
    figma.notify("🤔 No se encontraron grupos con el formato correcto.", { error: true });
  }
}

// --- FUNCIÓN DE AYUDA PARA CONVERTIR COLOR DE FIGMA A HEX ---
function rgbToHex(color: RGB): string {
  const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}