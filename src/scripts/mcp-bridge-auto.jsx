// mcp-bridge-auto.jsx
// Auto-running MCP Bridge panel for After Effects

// Remove #include directives as we define functions below
/*
#include "createComposition.jsx"
#include "createTextLayer.jsx"
#include "createShapeLayer.jsx"
#include "createSolidLayer.jsx"
#include "setLayerProperties.jsx"
*/

// --- Function Definitions ---

// --- createComposition (from createComposition.jsx) --- 
function createComposition(args) {
    try {
        var name = args.name || "New Composition";
        var width = parseInt(args.width) || 1920;
        var height = parseInt(args.height) || 1080;
        var pixelAspect = parseFloat(args.pixelAspect) || 1.0;
        var duration = parseFloat(args.duration) || 10.0;
        var frameRate = parseFloat(args.frameRate) || 30.0;
        var bgColor = args.backgroundColor ? [args.backgroundColor.r / 255, args.backgroundColor.g / 255, args.backgroundColor.b / 255] : [0, 0, 0];
        var newComp = app.project.items.addComp(name, width, height, pixelAspect, duration, frameRate);
        if (args.backgroundColor) {
            newComp.bgColor = bgColor;
        }
        return JSON.stringify({
            status: "success", message: "Composition created successfully",
            composition: { name: newComp.name, id: newComp.id, width: newComp.width, height: newComp.height, pixelAspect: newComp.pixelAspect, duration: newComp.duration, frameRate: newComp.frameRate, bgColor: newComp.bgColor }
        }, null, 2);
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() }, null, 2);
    }
}

// --- createTextLayer (from createTextLayer.jsx) ---
function createTextLayer(args) {
    try {
        var compName = args.compName || "";
        var text = args.text || "Text Layer";
        var position = args.position || [960, 540];
        var fontSize = args.fontSize || 72;
        var color = args.color || [1, 1, 1];
        var startTime = args.startTime || 0;
        var duration = args.duration || 5;
        var fontFamily = args.fontFamily || "Arial";
        var alignment = args.alignment || "center";
        var comp = null;
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem && item.name === compName) { comp = item; break; }
        }
        if (!comp) {
            if (app.project.activeItem instanceof CompItem) { comp = app.project.activeItem; }
            else { throw new Error("No composition found with name '" + compName + "' and no active composition"); }
        }
        var textLayer = comp.layers.addText(text);
        var textProp = textLayer.property("ADBE Text Properties").property("ADBE Text Document");
        var textDocument = textProp.value;
        textDocument.fontSize = fontSize;
        textDocument.fillColor = color;
        textDocument.font = fontFamily;
        if (alignment === "left") { textDocument.justification = ParagraphJustification.LEFT_JUSTIFY; }
        else if (alignment === "center") { textDocument.justification = ParagraphJustification.CENTER_JUSTIFY; }
        else if (alignment === "right") { textDocument.justification = ParagraphJustification.RIGHT_JUSTIFY; }
        textProp.setValue(textDocument);
        textLayer.property("Position").setValue(position);
        textLayer.startTime = startTime;
        if (duration > 0) { textLayer.outPoint = startTime + duration; }
        return JSON.stringify({
            status: "success", message: "Text layer created successfully",
            layer: { name: textLayer.name, index: textLayer.index, type: "text", inPoint: textLayer.inPoint, outPoint: textLayer.outPoint, position: textLayer.property("Position").value }
        }, null, 2);
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() }, null, 2);
    }
}

// --- createShapeLayer (from createShapeLayer.jsx) --- 
function createShapeLayer(args) {
    try {
        var compName = args.compName || "";
        var shapeType = args.shapeType || "rectangle";
        var position = args.position || [960, 540];
        var size = args.size || [200, 200];
        var fillColor = args.fillColor || [1, 0, 0];
        var strokeColor = args.strokeColor || [0, 0, 0];
        var strokeWidth = args.strokeWidth || 0;
        var startTime = args.startTime || 0;
        var duration = args.duration || 5;
        var name = args.name || "Shape Layer";
        var points = args.points || 5;
        var comp = null;
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem && item.name === compName) { comp = item; break; }
        }
        if (!comp) {
            if (app.project.activeItem instanceof CompItem) { comp = app.project.activeItem; }
            else { throw new Error("No composition found with name '" + compName + "' and no active composition"); }
        }
        var shapeLayer = comp.layers.addShape();
        shapeLayer.name = name;
        var contents = shapeLayer.property("Contents");
        var shapeGroup = contents.addProperty("ADBE Vector Group");
        var groupContents = shapeGroup.property("Contents");
        var shapePathProperty;
        if (shapeType === "rectangle") {
            shapePathProperty = groupContents.addProperty("ADBE Vector Shape - Rect");
            shapePathProperty.property("Size").setValue(size);
        } else if (shapeType === "ellipse") {
            shapePathProperty = groupContents.addProperty("ADBE Vector Shape - Ellipse");
            shapePathProperty.property("Size").setValue(size);
        } else if (shapeType === "polygon" || shapeType === "star") {
            shapePathProperty = groupContents.addProperty("ADBE Vector Shape - Star");
            shapePathProperty.property("Type").setValue(shapeType === "polygon" ? 1 : 2);
            shapePathProperty.property("Points").setValue(points);
            shapePathProperty.property("Outer Radius").setValue(size[0] / 2);
            if (shapeType === "star") { shapePathProperty.property("Inner Radius").setValue(size[0] / 3); }
        }
        var fill = groupContents.addProperty("ADBE Vector Graphic - Fill");
        fill.property("Color").setValue(fillColor);
        fill.property("Opacity").setValue(100);
        if (strokeWidth > 0) {
            var stroke = groupContents.addProperty("ADBE Vector Graphic - Stroke");
            stroke.property("Color").setValue(strokeColor);
            stroke.property("Stroke Width").setValue(strokeWidth);
            stroke.property("Opacity").setValue(100);
        }
        shapeLayer.property("Position").setValue(position);
        shapeLayer.startTime = startTime;
        if (duration > 0) { shapeLayer.outPoint = startTime + duration; }
        return JSON.stringify({
            status: "success", message: "Shape layer created successfully",
            layer: { name: shapeLayer.name, index: shapeLayer.index, type: "shape", shapeType: shapeType, inPoint: shapeLayer.inPoint, outPoint: shapeLayer.outPoint, position: shapeLayer.property("Position").value }
        }, null, 2);
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() }, null, 2);
    }
}

// --- createSolidLayer (from createSolidLayer.jsx) --- 
function createSolidLayer(args) {
    try {
        var compName = args.compName || "";
        var color = args.color || [1, 1, 1];
        var name = args.name || "Solid Layer";
        var position = args.position || [960, 540];
        var size = args.size;
        var startTime = args.startTime || 0;
        var duration = args.duration || 5;
        var isAdjustment = args.isAdjustment || false;
        var comp = null;
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem && item.name === compName) { comp = item; break; }
        }
        if (!comp) {
            if (app.project.activeItem instanceof CompItem) { comp = app.project.activeItem; }
            else { throw new Error("No composition found with name '" + compName + "' and no active composition"); }
        }
        if (!size) { size = [comp.width, comp.height]; }
        var solidLayer;
        if (isAdjustment) {
            solidLayer = comp.layers.addSolid([0, 0, 0], name, size[0], size[1], 1);
            solidLayer.adjustmentLayer = true;
        } else {
            solidLayer = comp.layers.addSolid(color, name, size[0], size[1], 1);
        }
        solidLayer.property("Position").setValue(position);
        solidLayer.startTime = startTime;
        if (duration > 0) { solidLayer.outPoint = startTime + duration; }
        return JSON.stringify({
            status: "success", message: isAdjustment ? "Adjustment layer created successfully" : "Solid layer created successfully",
            layer: { name: solidLayer.name, index: solidLayer.index, type: isAdjustment ? "adjustment" : "solid", inPoint: solidLayer.inPoint, outPoint: solidLayer.outPoint, position: solidLayer.property("Position").value, isAdjustment: solidLayer.adjustmentLayer }
        }, null, 2);
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() }, null, 2);
    }
}

// --- setLayerProperties (modified to handle text properties) ---
function setLayerProperties(args) {
    try {
        var compName = args.compName || "";
        var layerName = args.layerName || "";
        var layerIndex = args.layerIndex;

        // General Properties
        var position = args.position;
        var scale = args.scale;
        var rotation = args.rotation;
        var opacity = args.opacity;
        var startTime = args.startTime;
        var duration = args.duration;

        // Text Specific Properties
        var textContent = args.text; // New: text content
        var fontFamily = args.fontFamily; // New: font family
        var fontSize = args.fontSize; // New: font size
        var fillColor = args.fillColor; // New: font color

        // Find the composition (same logic as before)
        var comp = null;
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem && item.name === compName) { comp = item; break; }
        }
        if (!comp) {
            if (app.project.activeItem instanceof CompItem) { comp = app.project.activeItem; }
            else { throw new Error("No composition found with name '" + compName + "' and no active composition"); }
        }

        // Find the layer (same logic as before)
        var layer = null;
        if (layerIndex !== undefined && layerIndex !== null) {
            if (layerIndex > 0 && layerIndex <= comp.numLayers) { layer = comp.layer(layerIndex); }
            else { throw new Error("Layer index out of bounds: " + layerIndex); }
        } else if (layerName) {
            for (var j = 1; j <= comp.numLayers; j++) {
                if (comp.layer(j).name === layerName) { layer = comp.layer(j); break; }
            }
        }
        if (!layer) { throw new Error("Layer not found: " + (layerName || "index " + layerIndex)); }

        var changedProperties = [];
        var textDocumentChanged = false;
        var textProp = null;
        var textDocument = null;

        // --- Text Property Handling ---
        if (layer instanceof TextLayer && (textContent !== undefined || fontFamily !== undefined || fontSize !== undefined || fillColor !== undefined)) {
            var sourceTextProp = layer.property("Source Text");
            if (sourceTextProp && sourceTextProp.value) {
                var currentTextDocument = sourceTextProp.value; // Get the current value
                var updated = false;

                if (textContent !== undefined && textContent !== null && currentTextDocument.text !== textContent) {
                    currentTextDocument.text = textContent;
                    changedProperties.push("text");
                    updated = true;
                }
                if (fontFamily !== undefined && fontFamily !== null && currentTextDocument.font !== fontFamily) {
                    // Add basic validation/logging for font existence if needed
                    // try { app.fonts.findFont(fontFamily); } catch (e) { logToPanel("Warning: Font '"+fontFamily+"' might not be installed."); }
                    currentTextDocument.font = fontFamily;
                    changedProperties.push("fontFamily");
                    updated = true;
                }
                if (fontSize !== undefined && fontSize !== null && currentTextDocument.fontSize !== fontSize) {
                    currentTextDocument.fontSize = fontSize;
                    changedProperties.push("fontSize");
                    updated = true;
                }
                // Comparing colors needs care due to potential floating point inaccuracies if set via UI
                // Simple comparison for now
                if (fillColor !== undefined && fillColor !== null &&
                    (currentTextDocument.fillColor[0] !== fillColor[0] ||
                        currentTextDocument.fillColor[1] !== fillColor[1] ||
                        currentTextDocument.fillColor[2] !== fillColor[2])) {
                    currentTextDocument.fillColor = fillColor;
                    changedProperties.push("fillColor");
                    updated = true;
                }

                // Only set the value if something actually changed
                if (updated) {
                    try {
                        sourceTextProp.setValue(currentTextDocument);
                        logToPanel("Applied changes to Text Document for layer: " + layer.name);
                    } catch (e) {
                        logToPanel("ERROR applying Text Document changes: " + e.toString());
                        // Decide if we should throw or just log the error for text properties
                        // For now, just log, other properties might still succeed
                    }
                }
                // Store the potentially updated document for the return value
                textDocument = currentTextDocument;

            } else {
                logToPanel("Warning: Could not access Source Text property for layer: " + layer.name);
            }
        }

        // --- General Property Handling ---
        if (position !== undefined && position !== null) { layer.property("Position").setValue(position); changedProperties.push("position"); }
        if (scale !== undefined && scale !== null) { layer.property("Scale").setValue(scale); changedProperties.push("scale"); }
        if (rotation !== undefined && rotation !== null) {
            if (layer.threeDLayer) {
                // For 3D layers, Z rotation is often what's intended by a single value
                layer.property("Z Rotation").setValue(rotation);
            } else {
                layer.property("Rotation").setValue(rotation);
            }
            changedProperties.push("rotation");
        }
        if (opacity !== undefined && opacity !== null) { layer.property("Opacity").setValue(opacity); changedProperties.push("opacity"); }
        if (startTime !== undefined && startTime !== null) { layer.startTime = startTime; changedProperties.push("startTime"); }
        if (duration !== undefined && duration !== null && duration > 0) {
            var actualStartTime = (startTime !== undefined && startTime !== null) ? startTime : layer.startTime;
            layer.outPoint = actualStartTime + duration;
            changedProperties.push("duration");
        }

        // Return success with updated layer details (including text if changed)
        var returnLayerInfo = {
            name: layer.name,
            index: layer.index,
            position: layer.property("Position").value,
            scale: layer.property("Scale").value,
            rotation: layer.threeDLayer ? layer.property("Z Rotation").value : layer.property("Rotation").value, // Return appropriate rotation
            opacity: layer.property("Opacity").value,
            inPoint: layer.inPoint,
            outPoint: layer.outPoint,
            changedProperties: changedProperties
        };
        // Add text properties to the return object if it was a text layer
        if (layer instanceof TextLayer && textDocument) {
            returnLayerInfo.text = textDocument.text;
            returnLayerInfo.fontFamily = textDocument.font;
            returnLayerInfo.fontSize = textDocument.fontSize;
            returnLayerInfo.fillColor = textDocument.fillColor;
        }

        // *** ADDED LOGGING HERE ***
        logToPanel("Final check before return:");
        logToPanel("  Changed Properties: " + changedProperties.join(", "));
        logToPanel("  Return Layer Info Font: " + (returnLayerInfo.fontFamily || "N/A"));
        logToPanel("  TextDocument Font: " + (textDocument ? textDocument.font : "N/A"));

        return JSON.stringify({
            status: "success", message: "Layer properties updated successfully",
            layer: returnLayerInfo
        }, null, 2);
    } catch (error) {
        // Error handling remains similar, but add more specific checks if needed
        return JSON.stringify({ status: "error", message: error.toString() }, null, 2);
    }
}

/**
 * Sets a keyframe for a specific property on a layer.
 * Uses shared resolveComp/resolveLayer for dual lookup (compIndex/compName, layerIndex/layerName).
 * @param {object} args - Arguments object containing compIndex/compName, layerIndex/layerName, propertyName, timeInSeconds, value, and optional interpolation params.
 * @returns {string} JSON string indicating success or error.
 */
function setLayerKeyframe(args) {
    try {
        var comp = resolveComp(args);
        var layer = resolveLayer(comp, args);
        var propertyName = args.propertyName;
        var timeInSeconds = args.timeInSeconds;
        var value = args.value;

        var transformGroup = layer.property("Transform");
        var property = null;

        if (transformGroup) {
            property = transformGroup.property(propertyName);
        }

        if (!property) {
            // Check other common property groups if not in Transform
            if (layer.property("Effects") && layer.property("Effects").property(propertyName)) {
                property = layer.property("Effects").property(propertyName);
            } else if (layer.property("Text") && layer.property("Text").property(propertyName)) {
                property = layer.property("Text").property(propertyName);
            } else if (layer.property("Masks") && layer.property("Masks").property(propertyName)) {
                property = layer.property("Masks").property(propertyName);
            }

            if (!property) {
                return JSON.stringify({ status: "error", message: "Property '" + propertyName + "' not found on layer '" + layer.name + "'." });
            }
        }

        // Ensure the property can be keyframed
        if (!property.canVaryOverTime) {
            return JSON.stringify({ status: "error", message: "Property '" + propertyName + "' cannot be keyframed." });
        }

        // Make sure the property is enabled for keyframing
        if (property.numKeys === 0 && !property.isTimeVarying) {
            property.setValueAtTime(comp.time, property.value);
        }

        if (value === undefined) {
            value = property.value;
        }

        // Set the keyframe value
        property.setValueAtTime(timeInSeconds, value);

        // Handle interpolation if provided
        if (args.inType || args.outType) {
            var keyIndex = property.nearestKeyIndex(timeInSeconds);
            if (keyIndex > 0 && Math.abs(property.keyTime(keyIndex) - timeInSeconds) < 0.001) {
                var inType = args.inType || "linear";
                var outType = args.outType || "linear";
                var currentInInterp = property.keyInInterpolationType(keyIndex);
                var currentOutInterp = property.keyOutInterpolationType(keyIndex);

                var targetInInterp = (inType === "hold") ? KeyframeInterpolationType.HOLD : (inType === "bezier" ? KeyframeInterpolationType.BEZIER : KeyframeInterpolationType.LINEAR);
                var targetOutInterp = (outType === "hold") ? KeyframeInterpolationType.HOLD : (outType === "bezier" ? KeyframeInterpolationType.BEZIER : KeyframeInterpolationType.LINEAR);
                property.setInterpolationTypeAtKey(keyIndex, targetInInterp || currentInInterp, targetOutInterp || currentOutInterp);

                var needsEase = ((inType === "bezier" && args.easeIn) || (outType === "bezier" && args.easeOut));
                if (needsEase) {
                    var dimension = getPropertyDimension(property);

                    function buildEaseArray(easeArg, label) {
                        if (!easeArg) {
                            return null;
                        }

                        var speed = parseFloat(easeArg.speed);
                        if (isNaN(speed)) {
                            throw new Error(label + ".speed must be a number");
                        }

                        var influences = [];
                        if (easeArg.influence instanceof Array) {
                            influences = easeArg.influence.slice(0);
                        } else {
                            influences = [easeArg.influence];
                        }

                        if (influences.length === 0 || influences[0] === undefined || influences[0] === null) {
                            throw new Error(label + ".influence is required");
                        }

                        if (influences.length === 1 && dimension > 1) {
                            while (influences.length < dimension) {
                                influences.push(influences[0]);
                            }
                        }

                        if (influences.length < dimension) {
                            throw new Error(label + ".influence requires " + dimension + " value(s) for this property.");
                        }

                        var easeArray = [];
                        for (var d = 0; d < dimension; d++) {
                            var influence = parseFloat(influences[d]);
                            if (isNaN(influence)) {
                                throw new Error(label + ".influence[" + d + "] must be a number");
                            }
                            easeArray.push(new KeyframeEase(speed, influence));
                        }

                        return easeArray;
                    }

                    var inEase = buildEaseArray(args.easeIn, "easeIn") || property.keyInTemporalEase(keyIndex);
                    var outEase = buildEaseArray(args.easeOut, "easeOut") || property.keyOutTemporalEase(keyIndex);
                    property.setTemporalEaseAtKey(keyIndex, inEase, outEase);
                }
            }
        }

        return JSON.stringify({
            status: "success",
            message: "Keyframe set for '" + propertyName + "' on layer '" + layer.name + "' at " + timeInSeconds + "s.",
            layer: { name: layer.name, index: layer.index },
            property: propertyName,
            time: timeInSeconds
        });
    } catch (e) {
        return errorResponse("Error setting keyframe: " + e.toString() + (e.line ? " (Line: " + e.line + ")" : ""), "KEYFRAME_SET_FAILED", "Check property dimensions and easing payload. For multidimensional properties, provide scalar influence (auto-expanded) or an array.");
    }
}


/**
 * Sets an expression for a specific property on a layer.
 * Uses shared resolveComp/resolveLayer for dual lookup (compIndex/compName, layerIndex/layerName).
 * @param {object} args - Arguments object containing compIndex/compName, layerIndex/layerName, propertyName, expressionString.
 * @returns {string} JSON string indicating success or error.
 */
function setLayerExpression(args) {
    try {
        var comp = resolveComp(args);
        var layer = resolveLayer(comp, args);
        var propertyName = args.propertyName;
        var expressionString = args.expressionString;

        var transformGroup = layer.property("Transform");
        var property = null;

        if (transformGroup) {
            property = transformGroup.property(propertyName);
        }

        if (!property) {
            // Check other common property groups if not in Transform
            if (layer.property("Effects") && layer.property("Effects").property(propertyName)) {
                property = layer.property("Effects").property(propertyName);
            } else if (layer.property("Text") && layer.property("Text").property(propertyName)) {
                property = layer.property("Text").property(propertyName);
            } else if (layer.property("Masks") && layer.property("Masks").property(propertyName)) {
                property = layer.property("Masks").property(propertyName);
            }

            if (!property) {
                return JSON.stringify({ status: "error", message: "Property '" + propertyName + "' not found on layer '" + layer.name + "'." });
            }
        }

        if (!property.canSetExpression) {
            return JSON.stringify({ status: "error", message: "Property '" + propertyName + "' does not support expressions." });
        }

        property.expression = expressionString;

        var action = expressionString === "" ? "removed" : "set";
        return JSON.stringify({
            status: "success",
            message: "Expression " + action + " for '" + propertyName + "' on layer '" + layer.name + "'.",
            layer: { name: layer.name, index: layer.index },
            property: propertyName,
            expression: expressionString
        });
    } catch (e) {
        return JSON.stringify({ status: "error", message: "Error setting expression: " + e.toString() + (e.line ? " (Line: " + e.line + ")" : "") });
    }
}

// --- applyEffect (from applyEffect.jsx) ---
function applyEffect(args) {
    try {
        var effectName = args.effectName;
        var effectMatchName = args.effectMatchName;
        var effectCategory = args.effectCategory || "";
        var presetPath = args.presetPath;
        var effectSettings = args.effectSettings || {};
        var autoAdjustmentLayer = args.autoAdjustmentLayer === true;

        if (!effectName && !effectMatchName && !presetPath) {
            throw new Error("You must specify either effectName, effectMatchName, or presetPath");
        }

        // Use shared resolvers for dual lookup
        var comp = resolveComp(args);
        var layer = resolveLayer(comp, args);

        if (!layer.Effects) {
            return errorResponse(
                "Layer '" + layer.name + "' does not expose an Effects group.",
                "EFFECTS_UNAVAILABLE_ON_LAYER",
                "Some layer types do not support direct effect insertion.",
                "Try applying on an adjustment layer or choose another target layer."
            );
        }

        var effectResult;

        function addEffectToLayer(targetLayer) {
            if (effectMatchName) {
                return targetLayer.Effects.addProperty(effectMatchName);
            }
            return targetLayer.Effects.addProperty(effectName);
        }

        // Apply preset if a path is provided
        if (presetPath) {
            var presetFile = new File(presetPath);
            if (!presetFile.exists) {
                throw new Error("Effect preset file not found: " + presetPath);
            }

            // Apply the preset to the layer
            layer.applyPreset(presetFile);
            effectResult = {
                type: "preset",
                name: presetPath.split('/').pop().split('\\').pop(),
                applied: true
            };
        }
        // Apply effect by match name (more reliable method)
        else {
            var effect = null;
            var targetLayer = layer;
            try {
                effect = addEffectToLayer(layer);
            } catch (effectError) {
                if (!autoAdjustmentLayer) {
                    return errorResponse(
                        "Failed to apply effect on layer '" + layer.name + "': " + effectError.toString(),
                        "EFFECT_APPLY_FAILED",
                        "Some effects fail on specific layer types (for example text layers).",
                        "Retry with autoAdjustmentLayer=true or apply effect to an existing adjustment layer."
                    );
                }

                targetLayer = comp.layers.addSolid([1, 1, 1], "MCP Auto Adjustment", comp.width, comp.height, comp.pixelAspect, comp.duration);
                targetLayer.adjustmentLayer = true;
                targetLayer.moveBefore(layer);
                effect = addEffectToLayer(targetLayer);
            }

            effectResult = {
                type: "effect",
                name: effect.name,
                matchName: effect.matchName,
                index: effect.propertyIndex,
                appliedToLayer: {
                    name: targetLayer.name,
                    index: targetLayer.index,
                    isAdjustmentLayer: !!targetLayer.adjustmentLayer
                }
            };

            // Apply settings if provided
            applyEffectSettings(effect, effectSettings);
        }

        return JSON.stringify({
            status: "success",
            message: "Effect applied successfully",
            effect: effectResult,
            layer: {
                name: layer.name,
                index: layer.index
            },
            composition: {
                name: comp.name,
                id: comp.id
            }
        }, null, 2);
    } catch (error) {
        return errorResponse(
            error.toString(),
            "EFFECT_APPLY_FAILED",
            "Verify effectName/effectMatchName and layer support.",
            "Use get-effects-help to confirm matchName or retry with autoAdjustmentLayer=true."
        );
    }
}

// Helper function to apply effect settings
function applyEffectSettings(effect, settings) {
    // Skip if no settings are provided
    if (!settings || Object.keys(settings).length === 0) {
        return;
    }

    // Iterate through all provided settings
    for (var propName in settings) {
        if (settings.hasOwnProperty(propName)) {
            try {
                // Find the property in the effect
                var property = null;

                // Try direct property access first
                try {
                    property = effect.property(propName);
                } catch (e) {
                    // If direct access fails, search through all properties
                    for (var i = 1; i <= effect.numProperties; i++) {
                        var prop = effect.property(i);
                        if (prop.name === propName) {
                            property = prop;
                            break;
                        }
                    }
                }

                // Set the property value if found
                if (property && property.setValue) {
                    property.setValue(settings[propName]);
                }
            } catch (e) {
                // Log error but continue with other properties
                $.writeln("Error setting effect property '" + propName + "': " + e.toString());
            }
        }
    }
}

// --- applyEffectTemplate (from applyEffectTemplate.jsx) ---
function applyEffectTemplate(args) {
    try {
        var templateName = args.templateName;
        var customSettings = args.customSettings || {};

        if (!templateName) {
            throw new Error("You must specify a templateName");
        }

        // Use shared resolvers for dual lookup
        var comp = resolveComp(args);
        var layer = resolveLayer(comp, args);

        // Template definitions
        var templates = {
            // Blur effects
            "gaussian-blur": {
                effectMatchName: "ADBE Gaussian Blur 2",
                settings: {
                    "Blurriness": customSettings.blurriness || 20
                }
            },
            "directional-blur": {
                effectMatchName: "ADBE Directional Blur",
                settings: {
                    "Direction": customSettings.direction || 0,
                    "Blur Length": customSettings.length || 10
                }
            },

            // Color correction effects
            "color-balance": {
                effectMatchName: "ADBE Color Balance (HLS)",
                settings: {
                    "Hue": customSettings.hue || 0,
                    "Lightness": customSettings.lightness || 0,
                    "Saturation": customSettings.saturation || 0
                }
            },
            "brightness-contrast": {
                effectMatchName: "ADBE Brightness & Contrast 2",
                settings: {
                    "Brightness": customSettings.brightness || 0,
                    "Contrast": customSettings.contrast || 0,
                    "Use Legacy": false
                }
            },
            "curves": {
                effectMatchName: "ADBE CurvesCustom",
                // Curves are complex and would need special handling
            },

            // Stylistic effects
            "glow": {
                effectMatchName: "ADBE Glow",
                settings: {
                    "Glow Threshold": customSettings.threshold || 50,
                    "Glow Radius": customSettings.radius || 15,
                    "Glow Intensity": customSettings.intensity || 1
                }
            },
            "drop-shadow": {
                effectMatchName: "ADBE Drop Shadow",
                settings: {
                    "Shadow Color": customSettings.color || [0, 0, 0, 1],
                    "Opacity": customSettings.opacity || 50,
                    "Direction": customSettings.direction || 135,
                    "Distance": customSettings.distance || 10,
                    "Softness": customSettings.softness || 10
                }
            },

            // Common effect chains
            "cinematic-look": {
                effects: [
                    {
                        effectMatchName: "ADBE CurvesCustom",
                        settings: {}
                    },
                    {
                        effectMatchName: "ADBE Vibrance",
                        settings: {
                            "Vibrance": 15,
                            "Saturation": -5
                        }
                    }
                ]
            },
            "text-pop": {
                effects: [
                    {
                        effectMatchName: "ADBE Drop Shadow",
                        settings: {
                            "Shadow Color": [0, 0, 0, 1],
                            "Opacity": 75,
                            "Distance": 5,
                            "Softness": 10
                        }
                    },
                    {
                        effectMatchName: "ADBE Glow",
                        settings: {
                            "Glow Threshold": 50,
                            "Glow Radius": 10,
                            "Glow Intensity": 1.5
                        }
                    }
                ]
            }
        };

        // Check if the requested template exists
        var template = templates[templateName];
        if (!template) {
            var availableTemplates = Object.keys(templates).join(", ");
            throw new Error("Template '" + templateName + "' not found. Available templates: " + availableTemplates);
        }

        var appliedEffects = [];

        // Apply single effect or multiple effects based on template structure
        if (template.effectMatchName) {
            // Single effect template
            var effect = layer.Effects.addProperty(template.effectMatchName);

            // Apply settings
            for (var propName in template.settings) {
                try {
                    var property = effect.property(propName);
                    if (property) {
                        property.setValue(template.settings[propName]);
                    }
                } catch (e) {
                    $.writeln("Warning: Could not set " + propName + " on effect " + effect.name + ": " + e);
                }
            }

            appliedEffects.push({
                name: effect.name,
                matchName: effect.matchName
            });
        } else if (template.effects) {
            // Multiple effects template
            for (var i = 0; i < template.effects.length; i++) {
                var effectData = template.effects[i];
                var effect = layer.Effects.addProperty(effectData.effectMatchName);

                // Apply settings
                for (var propName in effectData.settings) {
                    try {
                        var property = effect.property(propName);
                        if (property) {
                            property.setValue(effectData.settings[propName]);
                        }
                    } catch (e) {
                        $.writeln("Warning: Could not set " + propName + " on effect " + effect.name + ": " + e);
                    }
                }

                appliedEffects.push({
                    name: effect.name,
                    matchName: effect.matchName
                });
            }
        }

        return JSON.stringify({
            status: "success",
            message: "Effect template '" + templateName + "' applied successfully",
            appliedEffects: appliedEffects,
            layer: {
                name: layer.name,
                index: layer.index
            },
            composition: {
                name: comp.name,
                id: comp.id
            }
        }, null, 2);
    } catch (error) {
        return JSON.stringify({
            status: "error",
            message: error.toString()
        }, null, 2);
    }
}
// --- End of Original Function Definitions ---

// =====================================================
// INFRASTRUCTURE HELPERS - Dual Lookup
// =====================================================

var AE_ERROR_CODES_JSX = {
    COMP_NOT_FOUND: "COMP_NOT_FOUND",
    LAYER_NOT_FOUND: "LAYER_NOT_FOUND",
    ITEM_NOT_FOUND: "ITEM_NOT_FOUND",
    PROP_NOT_FOUND: "PROP_NOT_FOUND",
    INVALID_INDEX: "INVALID_INDEX",
    NO_ACTIVE_COMP: "NO_ACTIVE_COMP",
    NO_PROJECT_OPEN: "NO_PROJECT_OPEN",
    INVALID_VALUE: "INVALID_VALUE",
    INTERNAL_ERROR: "INTERNAL_ERROR"
};

function createAEResolverError(code, message, details) {
    var err = new Error(message);
    err.aeCode = code;
    err.aeDetails = details || null;
    return err;
}

/** Resolve composition from args: compIndex (1-based) or compName */
function resolveComp(args) {
    if (!app.project) {
        throw createAEResolverError(AE_ERROR_CODES_JSX.NO_PROJECT_OPEN, "No After Effects project is open.");
    }
    var comp = null;
    if (args.compIndex !== undefined && args.compIndex !== null) {
        var idx = parseInt(args.compIndex, 10);
        if (idx < 1 || idx > app.project.numItems) {
            throw createAEResolverError(AE_ERROR_CODES_JSX.INVALID_INDEX, "Composition index " + idx + " out of range (1-" + app.project.numItems + ").", { providedIndex: idx, maxIndex: app.project.numItems });
        }
        comp = app.project.item(idx);
        if (!comp || !(comp instanceof CompItem)) {
            throw createAEResolverError(AE_ERROR_CODES_JSX.COMP_NOT_FOUND, "Item at index " + idx + " is not a composition.", { providedIndex: idx, itemType: comp ? "unknown" : "null" });
        }
    } else if (args.compName) {
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem && item.name === args.compName) {
                comp = item;
                break;
            }
        }
        if (!comp) {
            throw createAEResolverError(AE_ERROR_CODES_JSX.COMP_NOT_FOUND, "Composition not found with name '" + args.compName + "'.", { providedName: args.compName });
        }
    } else {
        if (app.project.activeItem instanceof CompItem) {
            comp = app.project.activeItem;
        } else {
            throw createAEResolverError(AE_ERROR_CODES_JSX.NO_ACTIVE_COMP, "No compIndex or compName provided, and no active composition.", { hint: "Create a comp first or pass compName/compIndex explicitly." });
        }
    }
    return comp;
}

function errorResponse(message, code, hint, recovery) {
    var payload = { status: "error", message: message };
    if (code) payload.code = code;
    if (hint) payload.hint = hint;
    if (recovery) payload.recovery = recovery;
    return JSON.stringify(payload);
}

function getPropertyDimension(property) {
    try {
        var value = property.value;
        if (value instanceof Array) return value.length;
    } catch (e) {}
    return 1;
}

function normalizeBatchCommand(command) {
    var aliases = {
        "create-composition": "createComposition",
        "create-text-layer": "createTextLayer",
        "create-shape-layer": "createShapeLayer",
        "create-solid-layer": "createSolidLayer",
        "set-layer-properties": "setLayerProperties",
        "set-layer-keyframe": "setLayerKeyframe",
        "set-layer-expression": "setLayerExpression",
        "apply-effect": "applyEffect",
        "apply-effect-template": "applyEffectTemplate",
        "move-layer": "moveLayer",
        "rename-layer": "renameLayer",
        "set-layer-visibility": "setLayerVisibility",
        "delete-layer": "deleteLayer",
        "set-blending-mode": "setBlendingMode",
        "set-layer-parent": "setLayerParent",
        "create-null-object": "createNullObject",
        "create-adjustment-layer": "createAdjustmentLayer",
        "get-layer-effects": "getLayerEffects",
        "get-effect-properties": "getEffectProperties",
        "set-effect-property": "setEffectProperty",
        "remove-effect": "removeEffect",
        "get-keyframes": "getKeyframes",
        "remove-keyframe": "removeKeyframe",
        "add-mask": "addMask",
        "set-track-matte": "setTrackMatte",
        "duplicate-layer": "duplicateLayer",
        "import-file": "importFile",
        "add-layer-from-item": "addLayerFromItem",
        "precompose-layers": "precomposeLayers",
        "set-text-properties": "setTextProperties",
        "get-text-properties": "getTextProperties",
        "modify-shape-path": "modifyShapePath",
        "set-shape-colors": "setShapeColors",
        "add-shape-group": "addShapeGroup",
        "create-camera": "createCamera",
        "create-light": "createLight",
        "add-marker": "addMarker",
        "get-markers": "getMarkers",
        "remove-marker": "removeMarker",
        "set-time-remapping": "setTimeRemapping",
        "set-motion-blur": "setMotionBlur",
        "set-frame-blending": "setFrameBlending",
        "add-to-render-queue": "addToRenderQueue",
        "start-render": "startRender",
        "capture-frame": "captureFrame",
        "save-project": "saveProject",
        "open-project": "openProject",
        "get-active-comp": "getActiveComp",
        "search-text-layers": "searchTextLayers",
        "inspect-property-tree": "inspectPropertyTree",
        "list-project-items": "listProjectItems",
        "get-project-item-info": "getProjectItemInfo",
        "get-composition-settings": "getCompositionSettings",
        "get-property-metadata": "getPropertyMetadata",
        "get-property-value": "getPropertyValue",
        "set-property-value": "setPropertyValue",
        "get-expression": "getExpression",
        "bridge-health": "bridgeHealth"
    };

    return aliases[command] || command;
}

/** Resolve layer from comp + args: layerIndex (1-based) or layerName */
function resolveLayer(comp, args) {
    var layer = null;
    if (args.layerIndex !== undefined && args.layerIndex !== null) {
        var idx = parseInt(args.layerIndex, 10);
        if (idx < 1 || idx > comp.numLayers) {
            throw createAEResolverError(AE_ERROR_CODES_JSX.INVALID_INDEX, "Layer index " + idx + " out of range (1-" + comp.numLayers + ") in comp '" + comp.name + "'.", { providedIndex: idx, maxIndex: comp.numLayers, compName: comp.name });
        }
        layer = comp.layer(idx);
    } else if (args.layerName) {
        for (var j = 1; j <= comp.numLayers; j++) {
            if (comp.layer(j).name === args.layerName) {
                layer = comp.layer(j);
                break;
            }
        }
        if (!layer) {
            throw createAEResolverError(AE_ERROR_CODES_JSX.LAYER_NOT_FOUND, "Layer not found with name '" + args.layerName + "' in comp '" + comp.name + "'.", { providedName: args.layerName, compName: comp.name });
        }
    } else {
        throw createAEResolverError(AE_ERROR_CODES_JSX.INVALID_INDEX, "No layerIndex or layerName provided.", { compName: comp.name });
    }
    return layer;
}

function isoTimestamp() {
    var d = new Date();
    function pad(n) { return n < 10 ? '0' + n : n; }
    return d.getFullYear() + '-'
        + pad(d.getMonth() + 1) + '-'
        + pad(d.getDate()) + 'T'
        + pad(d.getHours()) + ':'
        + pad(d.getMinutes()) + ':'
        + pad(d.getSeconds()) + 'Z';
}

function successEnvelope(command, data, warnings, meta) {
    return JSON.stringify({
        status: "success",
        command: command,
        timestamp: isoTimestamp(),
        data: data,
        warnings: warnings || [],
        meta: meta || {}
    }, null, 2);
}

function errorEnvelope(command, code, message, rawMessage, details) {
    return JSON.stringify({
        status: "error",
        command: command,
        timestamp: isoTimestamp(),
        error: {
            code: code || "INTERNAL_ERROR",
            message: message,
            rawMessage: rawMessage || message,
            details: details || null
        }
    }, null, 2);
}

function wrapWithUndo(label, fn) {
    return function() {
        app.beginUndoGroup(label);
        try {
            var result = fn.apply(this, arguments);
            app.endUndoGroup();
            return result;
        } catch (e) {
            app.endUndoGroup();
            throw e;
        }
    };
}

function executeWithUndo(label, fn) {
    app.beginUndoGroup(label);
    try {
        var result = fn();
        app.endUndoGroup();
        return result;
    } catch (e) {
        app.endUndoGroup();
        throw e;
    }
}

function extractResolverError(e, command) {
    if (e && e.aeCode) {
        return errorEnvelope(command, e.aeCode, e.message, e.message, e.aeDetails);
    }
    return errorEnvelope(command, "INTERNAL_ERROR", e.message || String(e), e.message || String(e), null);
}

function inferPropertyValueTypeName(property) {
    try {
        switch (property.propertyValueType) {
            case PropertyValueType.NO_VALUE: return "noValue";
            case PropertyValueType.OneD: return "oneD";
            case PropertyValueType.TwoD: return "twoD";
            case PropertyValueType.TwoD_SPATIAL: return "twoDSpatial";
            case PropertyValueType.ThreeD: return "threeD";
            case PropertyValueType.ThreeD_SPATIAL: return "threeDSpatial";
            case PropertyValueType.COLOR: return "color";
            case PropertyValueType.CUSTOM_VALUE: return "customValue";
            case PropertyValueType.SHAPE: return "shape";
            case PropertyValueType.TEXT_DOCUMENT: return "textDocument";
            case PropertyValueType.MARKER: return "marker";
            case PropertyValueType.LAYER_INDEX: return "layerIndex";
            case PropertyValueType.MASK_INDEX: return "maskIndex";
            default: return "unknown";
        }
    } catch (e) {
        return "unknown";
    }
}

function serializeValue(value) {
    if (value === null || value === undefined) return value;
    if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") return value;
    if (value instanceof Array) {
        var arr = [];
        for (var i = 0; i < value.length; i++) arr.push(serializeValue(value[i]));
        return arr;
    }
    try {
        if (value.vertices !== undefined && value.inTangents !== undefined && value.outTangents !== undefined) {
            return {
                vertices: value.vertices,
                inTangents: value.inTangents,
                outTangents: value.outTangents,
                closed: value.closed
            };
        }
    } catch (e1) {}
    try {
        if (value.fontSize !== undefined || value.font !== undefined || value.applyFill !== undefined) {
            var textPayload = {};
            try { textPayload.text = value.text; } catch (t1) {}
            try { textPayload.font = value.font; } catch (t2) {}
            try { textPayload.fontFamily = value.fontFamily; } catch (t3) {}
            try { textPayload.fontStyle = value.fontStyle; } catch (t4) {}
            try { textPayload.fontSize = value.fontSize; } catch (t5) {}
            try { textPayload.fillColor = value.fillColor; } catch (t6) {}
            try { textPayload.strokeColor = value.strokeColor; } catch (t7) {}
            try { textPayload.strokeWidth = value.strokeWidth; } catch (t8) {}
            try { textPayload.applyFill = value.applyFill; } catch (t9) {}
            try { textPayload.applyStroke = value.applyStroke; } catch (t10) {}
            try { textPayload.tracking = value.tracking; } catch (t11) {}
            try { textPayload.leading = value.leading; } catch (t12) {}
            try { textPayload.justification = value.justification ? value.justification.toString() : null; } catch (t13) {}
            try { textPayload.boxText = value.boxText; } catch (t14) {}
            try { textPayload.boxTextSize = value.boxTextSize; } catch (t15) {}
            return textPayload;
        }
    } catch (e2) {}
    try {
        if (value.comment !== undefined && value.duration !== undefined) {
            return {
                comment: value.comment,
                chapter: value.chapter,
                url: value.url,
                duration: value.duration,
                frameTarget: value.frameTarget,
                cuePointName: value.cuePointName
            };
        }
    } catch (e3) {}
    var fallback = {};
    for (var key in value) {
        try {
            fallback[key] = serializeValue(value[key]);
        } catch (e4) {}
    }
    return fallback;
}

function makePathString(segments) {
    var out = [];
    for (var i = 0; i < segments.length; i++) {
        var seg = segments[i];
        if (seg.matchName) out.push("matchName:" + seg.matchName);
        else if (seg.name) out.push("name:" + seg.name);
        else if (seg.index !== undefined) out.push("index:" + seg.index);
    }
    return out.join(" > ");
}

function normalizeSegments(args) {
    if (args.propertyPath && args.propertyPath.segments) {
        return args.propertyPath.segments;
    }
    if (args.propertyPathString) {
        var parts = String(args.propertyPathString).split(/\s*(?:>|\.)\s*/);
        var parsed = [];
        for (var i = 0; i < parts.length; i++) {
            var token = parts[i];
            if (!token) continue;
            if (/^matchName:/i.test(token)) parsed.push({ matchName: token.replace(/^matchName:/i, "") });
            else if (/^name:/i.test(token)) parsed.push({ name: token.replace(/^name:/i, "") });
            else if (/^index:/i.test(token)) parsed.push({ index: parseInt(token.replace(/^index:/i, ""), 10) });
            else if (/^\d+$/.test(token)) parsed.push({ index: parseInt(token, 10) });
            else parsed.push({ name: token });
        }
        return parsed;
    }
    if (args.propertyName) {
        return [{ name: args.propertyName }];
    }
    return [];
}

function findPropertyByNameOrMatchName(group, token) {
    if (!group || !group.numProperties) return null;
    for (var i = 1; i <= group.numProperties; i++) {
        var child = group.property(i);
        if (!child) continue;
        if (token.name && child.name === token.name) return child;
        if (token.matchName && child.matchName === token.matchName) return child;
    }
    return null;
}

function resolvePropertyTarget(layer, args) {
    var segments = normalizeSegments(args);
    if (!segments || segments.length === 0) {
        throw new Error("No property path or propertyName provided.");
    }
    var current = layer;
    var pathSegments = [];
    for (var i = 0; i < segments.length; i++) {
        var token = segments[i];
        var next = null;
        if (token.index !== undefined && token.index !== null) {
            next = current.property(parseInt(token.index, 10));
        } else {
            next = current.property(token.name || token.matchName);
            if (!next) next = findPropertyByNameOrMatchName(current, token);
        }
        if (!next) {
            throw new Error("Property segment not found at step " + (i + 1) + ": " + (token.name || token.matchName || token.index));
        }
        pathSegments.push({
            name: next.name,
            matchName: next.matchName,
            index: next.propertyIndex
        });
        current = next;
    }
    return {
        property: current,
        canonicalPath: { segments: pathSegments },
        canonicalPathString: makePathString(pathSegments)
    };
}

function serializePropertyMetadata(property, canonicalPath) {
    return {
        name: property.name,
        matchName: property.matchName,
        propertyIndex: property.propertyIndex,
        propertyDepth: property.propertyDepth,
        propertyType: property.propertyType ? property.propertyType.toString() : null,
        valueType: inferPropertyValueTypeName(property),
        canSetExpression: !!property.canSetExpression,
        canVaryOverTime: !!property.canVaryOverTime,
        isTimeVarying: !!property.isTimeVarying,
        numKeys: property.numKeys || 0,
        hasMin: !!property.hasMin,
        hasMax: !!property.hasMax,
        minValue: property.hasMin ? property.minValue : null,
        maxValue: property.hasMax ? property.maxValue : null,
        path: canonicalPath,
        pathString: makePathString(canonicalPath.segments)
    };
}

function buildPropertyTreeNode(property, pathSegments, depth, maxDepth, includeValues) {
    var canonicalPath = { segments: pathSegments.slice(0) };
    var node = serializePropertyMetadata(property, canonicalPath);
    if (includeValues) {
        try { node.value = serializeValue(property.value); } catch (e) {}
    }
    if (depth >= maxDepth || !property.numProperties) {
        node.children = [];
        return node;
    }
    node.children = [];
    for (var i = 1; i <= property.numProperties; i++) {
        var child = property.property(i);
        if (!child) continue;
        var childSegments = pathSegments.concat([{ name: child.name, matchName: child.matchName, index: child.propertyIndex }]);
        node.children.push(buildPropertyTreeNode(child, childSegments, depth + 1, maxDepth, includeValues));
    }
    return node;
}

// =====================================================
// PRIORITY 1 TOOLS - ExtendScript Functions
// =====================================================

/** P1: Reorder a layer in the timeline */
function moveLayer(args) {
    try {
        var comp = resolveComp(args);
        var layer = resolveLayer(comp, args);
        var newIndex = parseInt(args.newIndex);

        if (newIndex < 1 || newIndex > comp.numLayers) {
            return errorEnvelope("moveLayer", "INVALID_INDEX", "newIndex " + newIndex + " out of range (1-" + comp.numLayers + ").", null, { providedIndex: newIndex, maxIndex: comp.numLayers });
        }

        var currentIndex = layer.index;
        if (currentIndex === newIndex) {
            return successEnvelope("moveLayer", {
                message: "Layer '" + layer.name + "' is already at index " + newIndex + ".",
                layer: { name: layer.name, index: layer.index }
            });
        }

        if (newIndex < currentIndex) {
            layer.moveBefore(comp.layer(newIndex));
        } else {
            layer.moveAfter(comp.layer(newIndex));
        }

        return successEnvelope("moveLayer", {
            message: "Layer '" + layer.name + "' moved from index " + currentIndex + " to " + layer.index + ".",
            layer: { name: layer.name, index: layer.index, previousIndex: currentIndex }
        });
    } catch (error) {
        return extractResolverError(error, "moveLayer");
    }
}

/** P1: Rename a layer */
function renameLayer(args) {
    try {
        var comp = resolveComp(args);
        var layer = resolveLayer(comp, args);
        var newName = args.newName;

        if (newName === undefined || newName === null || String(newName).replace(/^\s+|\s+$/g, "") === "") {
            return errorEnvelope("renameLayer", "INVALID_VALUE", "newName is required and cannot be empty.", null, { providedName: newName });
        }

        var oldName = layer.name;
        layer.name = String(newName);

        return successEnvelope("renameLayer", {
            message: "Layer renamed from '" + oldName + "' to '" + layer.name + "'.",
            layer: { name: layer.name, previousName: oldName, index: layer.index }
        });
    } catch (error) {
        return extractResolverError(error, "renameLayer");
    }
}

/** P1: Toggle layer visibility */
function setLayerVisibility(args) {
    try {
        var comp = resolveComp(args);
        var layer = resolveLayer(comp, args);
        var enabled = (args.enabled === true || args.enabled === "true");
        layer.enabled = enabled;
        return successEnvelope("setLayerVisibility", {
            message: "Layer '" + layer.name + "' visibility set to " + (enabled ? "visible" : "hidden") + ".",
            layer: { name: layer.name, index: layer.index, enabled: layer.enabled }
        });
    } catch (error) {
        return extractResolverError(error, "setLayerVisibility");
    }
}

/** P1: Delete a layer */
function deleteLayer(args) {
    try {
        var comp = resolveComp(args);
        var layer = resolveLayer(comp, args);
        var layerName = layer.name;
        var layerIndex = layer.index;
        layer.remove();
        return successEnvelope("deleteLayer", {
            message: "Layer '" + layerName + "' (was index " + layerIndex + ") deleted.",
            deletedLayer: { name: layerName, index: layerIndex }
        });
    } catch (error) {
        return extractResolverError(error, "deleteLayer");
    }
}

/** P1: Set blending mode */
function setBlendingMode(args) {
    try {
        var comp = resolveComp(args);
        var layer = resolveLayer(comp, args);
        var modeStr = args.blendMode;

        // Map string names to AE BlendingMode enum
        var modeMap = {
            "normal": BlendingMode.NORMAL,
            "dissolve": BlendingMode.DISSOLVE,
            "dancingDissolve": BlendingMode.DANCING_DISSOLVE,
            "darken": BlendingMode.DARKEN,
            "multiply": BlendingMode.MULTIPLY,
            "colorBurn": BlendingMode.COLOR_BURN,
            "linearBurn": BlendingMode.LINEAR_BURN,
            "darkerColor": BlendingMode.DARKER_COLOR,
            "lighten": BlendingMode.LIGHTEN,
            "screen": BlendingMode.SCREEN,
            "colorDodge": BlendingMode.COLOR_DODGE,
            "linearDodge": BlendingMode.LINEAR_DODGE,
            "lighterColor": BlendingMode.LIGHTER_COLOR,
            "overlay": BlendingMode.OVERLAY,
            "softLight": BlendingMode.SOFT_LIGHT,
            "hardLight": BlendingMode.HARD_LIGHT,
            "vividLight": BlendingMode.VIVID_LIGHT,
            "linearLight": BlendingMode.LINEAR_LIGHT,
            "pinLight": BlendingMode.PIN_LIGHT,
            "hardMix": BlendingMode.HARD_MIX,
            "difference": BlendingMode.DIFFERENCE,
            "exclusion": BlendingMode.EXCLUSION,
            "subtract": BlendingMode.SUBTRACT,
            "divide": BlendingMode.DIVIDE,
            "hue": BlendingMode.HUE,
            "saturation": BlendingMode.SATURATION,
            "color": BlendingMode.COLOR,
            "luminosity": BlendingMode.LUMINOSITY,
            "add": BlendingMode.ADD,
            "luminoscentPremul": BlendingMode.LUMINESCENT_PREMUL,
            "silhouetteAlpha": BlendingMode.SILHOUETE_ALPHA,
            "silhouetteLuma": BlendingMode.SILHOUETTE_LUMA,
            "stencilAlpha": BlendingMode.STENCIL_ALPHA,
            "stencilLuma": BlendingMode.STENCIL_LUMA,
            "alphaAdd": BlendingMode.ALPHA_ADD
        };

        var mode = modeMap[modeStr];
        if (mode === undefined) {
            return errorEnvelope("setBlendingMode", "INVALID_VALUE", "Unknown blend mode: '" + modeStr + "'.", null, { providedMode: modeStr, validModes: Object.keys(modeMap) });
        }

        layer.blendingMode = mode;

        return successEnvelope("setBlendingMode", {
            message: "Layer '" + layer.name + "' blending mode set to '" + modeStr + "'.",
            layer: { name: layer.name, index: layer.index, blendingMode: modeStr }
        });
    } catch (error) {
        return extractResolverError(error, "setBlendingMode");
    }
}

/** P1: Set layer parent */
function setLayerParent(args) {
    try {
        var comp = resolveComp(args);
        var layer = resolveLayer(comp, args);

        if (args.parentLayerIndex === null || args.parentLayerIndex === "null") {
            layer.parent = null;
            return successEnvelope("setLayerParent", {
                message: "Layer '" + layer.name + "' parent removed.",
                layer: { name: layer.name, index: layer.index, parent: null }
            });
        }

        var parentLayer = null;
        if (args.parentLayerIndex !== undefined && args.parentLayerIndex !== null) {
            var pIdx = parseInt(args.parentLayerIndex);
            if (pIdx < 1 || pIdx > comp.numLayers) {
                return errorEnvelope("setLayerParent", "INVALID_INDEX", "Parent layer index " + pIdx + " out of range (1-" + comp.numLayers + ").", null, { providedIndex: pIdx, maxIndex: comp.numLayers });
            }
            parentLayer = comp.layer(pIdx);
        } else if (args.parentLayerName) {
            for (var j = 1; j <= comp.numLayers; j++) {
                if (comp.layer(j).name === args.parentLayerName) {
                    parentLayer = comp.layer(j);
                    break;
                }
            }
            if (!parentLayer) {
                return errorEnvelope("setLayerParent", "LAYER_NOT_FOUND", "Parent layer not found: '" + args.parentLayerName + "'.", null, { providedName: args.parentLayerName });
            }
        } else {
            return errorEnvelope("setLayerParent", "INVALID_VALUE", "No parentLayerIndex or parentLayerName provided.", null, null);
        }

        if (parentLayer.index === layer.index) {
            return errorEnvelope("setLayerParent", "INVALID_VALUE", "A layer cannot be its own parent.", null, { layerIndex: layer.index });
        }

        layer.parent = parentLayer;

        return successEnvelope("setLayerParent", {
            message: "Layer '" + layer.name + "' parented to '" + parentLayer.name + "'.",
            layer: { name: layer.name, index: layer.index, parent: { name: parentLayer.name, index: parentLayer.index } }
        });
    } catch (error) {
        return extractResolverError(error, "setLayerParent");
    }
}

/** P1: Create null object */
function createNullObject(args) {
    try {
        var comp = resolveComp(args);
        var nullLayer = comp.layers.addNull();
        if (args.name) {
            nullLayer.name = args.name;
        }
        return successEnvelope("createNullObject", {
            message: "Null object '" + nullLayer.name + "' created.",
            layer: { name: nullLayer.name, index: nullLayer.index, type: "null" }
        });
    } catch (error) {
        return extractResolverError(error, "createNullObject");
    }
}

/** P1: Create adjustment layer */
function createAdjustmentLayer(args) {
    try {
        var comp = resolveComp(args);
        var name = args.name || "Adjustment Layer";
        var adjLayer = comp.layers.addSolid([0, 0, 0], name, comp.width, comp.height, 1);
        adjLayer.adjustmentLayer = true;
        return successEnvelope("createAdjustmentLayer", {
            message: "Adjustment layer '" + adjLayer.name + "' created.",
            layer: { name: adjLayer.name, index: adjLayer.index, type: "adjustment", adjustmentLayer: true }
        });
    } catch (error) {
        return extractResolverError(error, "createAdjustmentLayer");
    }
}

// =====================================================
// PRIORITY 2 TOOLS - Effect and Property Control
// =====================================================

/** P2: List all effects on a layer */
function getLayerEffects(args) {
    try {
        var comp = resolveComp(args);
        var layer = resolveLayer(comp, args);
        var effects = layer.property("Effects");
        var result = [];
        if (effects) {
            for (var i = 1; i <= effects.numProperties; i++) {
                var eff = effects.property(i);
                result.push({
                    index: i,
                    name: eff.name,
                    matchName: eff.matchName,
                    enabled: eff.enabled,
                    numProperties: eff.numProperties
                });
            }
        }
        return successEnvelope("getLayerEffects", {
            layer: { name: layer.name, index: layer.index },
            effects: result,
            count: result.length
        });
    } catch (error) {
        return extractResolverError(error, "getLayerEffects");
    }
}

/** P2: Read effect property values */
function getEffectProperties(args) {
    try {
        var comp = resolveComp(args);
        var layer = resolveLayer(comp, args);
        var effects = layer.property("Effects");
        if (!effects) throw new Error("No effects on layer '" + layer.name + "'");

        var effect = null;
        if (args.effectIndex) {
            effect = effects.property(parseInt(args.effectIndex));
        } else if (args.effectName) {
            effect = effects.property(args.effectName);
        }
        if (!effect) throw new Error("Effect not found: " + (args.effectIndex || args.effectName));

        var props = [];
        for (var i = 1; i <= effect.numProperties; i++) {
            var prop = effect.property(i);
            var propInfo = {
                index: i,
                name: prop.name,
                matchName: prop.matchName
            };
            try {
                if (prop.value !== undefined) propInfo.value = prop.value;
            } catch (e) { /* some properties don't have values */ }
            props.push(propInfo);
        }

        return JSON.stringify({
            status: "success",
            effect: { name: effect.name, matchName: effect.matchName, index: effect.propertyIndex },
            properties: props
        });
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() });
    }
}

/** P2: Modify an existing effect property */
function setEffectProperty(args) {
    try {
        var comp = resolveComp(args);
        var layer = resolveLayer(comp, args);
        var effects = layer.property("Effects");
        if (!effects) throw new Error("No effects on layer '" + layer.name + "'");

        var effect = null;
        if (args.effectIndex) {
            effect = effects.property(parseInt(args.effectIndex));
        } else if (args.effectName) {
            effect = effects.property(args.effectName);
        }
        if (!effect) throw new Error("Effect not found");

        var prop = effect.property(args.propertyName);
        if (!prop) {
            // Try by index search
            for (var i = 1; i <= effect.numProperties; i++) {
                if (effect.property(i).name === args.propertyName) {
                    prop = effect.property(i);
                    break;
                }
            }
        }
        if (!prop) throw new Error("Property '" + args.propertyName + "' not found on effect '" + effect.name + "'");

        prop.setValue(args.value);

        return JSON.stringify({
            status: "success",
            message: "Set '" + args.propertyName + "' on effect '" + effect.name + "' to: " + JSON.stringify(args.value),
            effect: { name: effect.name, index: effect.propertyIndex },
            property: { name: prop.name, newValue: args.value }
        });
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() });
    }
}

/** P2: Remove an effect from a layer */
function removeEffect(args) {
    try {
        var comp = resolveComp(args);
        var layer = resolveLayer(comp, args);
        var effects = layer.property("Effects");
        if (!effects) throw new Error("No effects on layer '" + layer.name + "'");

        var effect = null;
        if (args.effectIndex) {
            effect = effects.property(parseInt(args.effectIndex));
        } else if (args.effectName) {
            effect = effects.property(args.effectName);
        }
        if (!effect) throw new Error("Effect not found");

        var effectName = effect.name;
        effect.remove();

        return JSON.stringify({
            status: "success",
            message: "Removed effect '" + effectName + "' from layer '" + layer.name + "'."
        });
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() });
    }
}

/** P2: Search all text layers for matching content */
function searchTextLayers(args) {
    try {
        var comp = resolveComp(args);
        var query = args.searchText || "";
        var caseSensitive = args.caseSensitive || false;
        if (!caseSensitive) query = query.toLowerCase();
        var matches = [];
        for (var i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i);
            if (layer instanceof TextLayer) {
                try {
                    var text = layer.property("Source Text").value.text;
                    var compare = caseSensitive ? text : text.toLowerCase();
                    if (compare.indexOf(query) !== -1) {
                        matches.push({
                            index: layer.index,
                            name: layer.name,
                            text: text,
                            inPoint: layer.inPoint,
                            outPoint: layer.outPoint
                        });
                    }
                } catch(e) { /* skip unreadable text layer */ }
            }
        }
        return JSON.stringify({
            status: "success",
            query: args.searchText,
            caseSensitive: caseSensitive,
            matchCount: matches.length,
            matches: matches
        });
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() });
    }
}

/** P2: Enhanced getLayerInfo - returns comprehensive properties */
function getLayerInfoEnhanced(args) {
    try {
        var comp = resolveComp(args);
        var layers = [];

        for (var i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i);
            var layerType = "unknown";
            if (layer instanceof TextLayer) layerType = "text";
            else if (layer instanceof ShapeLayer) layerType = "shape";
            else if (layer instanceof CameraLayer) layerType = "camera";
            else if (layer instanceof LightLayer) layerType = "light";
            else if (layer.nullLayer) layerType = "null";
            else if (layer.adjustmentLayer) layerType = "adjustment";
            else if (layer.source && layer.source instanceof CompItem) layerType = "precomp";
            else if (layer instanceof AVLayer) layerType = "avLayer";

            var info = {
                index: layer.index,
                name: layer.name,
                type: layerType,
                enabled: layer.enabled,
                locked: layer.locked,
                solo: layer.solo,
                shy: layer.shy,
                is3D: layer.threeDLayer,
                adjustmentLayer: layer.adjustmentLayer,
                inPoint: layer.inPoint,
                outPoint: layer.outPoint,
                startTime: layer.startTime,
                stretch: layer.stretch,
                parent: layer.parent ? { name: layer.parent.name, index: layer.parent.index } : null,
                label: layer.label
            };

            // Get blending mode name
            try {
                var blendModeMap = {};
                blendModeMap[BlendingMode.NORMAL] = "normal";
                blendModeMap[BlendingMode.MULTIPLY] = "multiply";
                blendModeMap[BlendingMode.SCREEN] = "screen";
                blendModeMap[BlendingMode.ADD] = "add";
                blendModeMap[BlendingMode.OVERLAY] = "overlay";
                blendModeMap[BlendingMode.SOFT_LIGHT] = "softLight";
                blendModeMap[BlendingMode.HARD_LIGHT] = "hardLight";
                blendModeMap[BlendingMode.DARKEN] = "darken";
                blendModeMap[BlendingMode.LIGHTEN] = "lighten";
                blendModeMap[BlendingMode.DIFFERENCE] = "difference";
                blendModeMap[BlendingMode.COLOR_DODGE] = "colorDodge";
                blendModeMap[BlendingMode.COLOR_BURN] = "colorBurn";
                blendModeMap[BlendingMode.LINEAR_DODGE] = "linearDodge";
                blendModeMap[BlendingMode.LINEAR_BURN] = "linearBurn";
                blendModeMap[BlendingMode.DISSOLVE] = "dissolve";
                blendModeMap[BlendingMode.EXCLUSION] = "exclusion";
                blendModeMap[BlendingMode.HUE] = "hue";
                blendModeMap[BlendingMode.SATURATION] = "saturation";
                blendModeMap[BlendingMode.COLOR] = "color";
                blendModeMap[BlendingMode.LUMINOSITY] = "luminosity";
                info.blendingMode = blendModeMap[layer.blendingMode] || "unknown";
            } catch (e) { info.blendingMode = "unknown"; }

            // Transform properties
            try {
                info.position = layer.property("Position").value;
                info.anchorPoint = layer.property("Anchor Point").value;
                info.scale = layer.property("Scale").value;
                info.opacity = layer.property("Opacity").value;
                if (layer.threeDLayer) {
                    info.rotationX = layer.property("X Rotation").value;
                    info.rotationY = layer.property("Y Rotation").value;
                    info.rotationZ = layer.property("Z Rotation").value;
                } else {
                    info.rotation = layer.property("Rotation").value;
                }
            } catch (e) { /* some layers don't have transforms */ }

            // Track matte
            try {
                var tmMap = {};
                tmMap[TrackMatteType.NO_TRACK_MATTE] = "none";
                tmMap[TrackMatteType.ALPHA] = "alpha";
                tmMap[TrackMatteType.ALPHA_INVERTED] = "alphaInverted";
                tmMap[TrackMatteType.LUMA] = "luma";
                tmMap[TrackMatteType.LUMA_INVERTED] = "lumaInverted";
                info.trackMatteType = tmMap[layer.trackMatteType] || "none";
            } catch (e) { info.trackMatteType = "none"; }

            // Effects list
            try {
                var effs = layer.property("Effects");
                var effList = [];
                if (effs) {
                    for (var j = 1; j <= effs.numProperties; j++) {
                        effList.push(effs.property(j).name);
                    }
                }
                info.effects = effList;
            } catch (e) { info.effects = []; }

            // Source info
            try {
                if (layer.source) info.sourceName = layer.source.name;
            } catch (e) { }

            // Expressions
            try {
                var exprProps = ["Position", "Scale", "Rotation", "Opacity"];
                var hasExpr = {};
                for (var k = 0; k < exprProps.length; k++) {
                    try {
                        var p = layer.property("Transform").property(exprProps[k]);
                        hasExpr[exprProps[k]] = (p && p.expression && p.expression.length > 0);
                    } catch (e2) { hasExpr[exprProps[k]] = false; }
                }
                info.hasExpressions = hasExpr;
            } catch (e) { }

            // Text layer content
            if (layer instanceof TextLayer) {
                try {
                    var td = layer.property("Source Text").value;
                    info.text = td.text;
                    info.font = td.font;
                    info.fontSize = td.fontSize;
                } catch (e) { }
            }

            layers.push(info);
        }

        // Post-loop filtering by type
        if (args.filterType) {
            var filtered = [];
            for (var f = 0; f < layers.length; f++) {
                if (layers[f].type === args.filterType) filtered.push(layers[f]);
            }
            layers = filtered;
        }
        // Post-loop filtering by layer indices
        if (args.layerIndices && args.layerIndices.length > 0) {
            var idxSet = {};
            for (var n = 0; n < args.layerIndices.length; n++) idxSet[args.layerIndices[n]] = true;
            var filtered2 = [];
            for (var f2 = 0; f2 < layers.length; f2++) {
                if (idxSet[layers[f2].index]) filtered2.push(layers[f2]);
            }
            layers = filtered2;
        }

        return JSON.stringify({
            status: "success",
            composition: { name: comp.name, index: comp.index, numLayers: comp.numLayers },
            layers: layers
        });
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() });
    }
}

// =====================================================
// PRIORITY 3 TOOLS - Animation and Keyframes
// =====================================================

/** P3: Read existing keyframes */
function getKeyframes(args) {
    try {
        var comp = resolveComp(args);
        var layer = resolveLayer(comp, args);

        // Find the property
        var prop = null;
        try { prop = layer.property("Transform").property(args.propertyName); } catch (e) { }
        if (!prop) try { prop = layer.property(args.propertyName); } catch (e) { }
        if (!prop) throw new Error("Property '" + args.propertyName + "' not found on layer '" + layer.name + "'");

        var keyframes = [];
        for (var i = 1; i <= prop.numKeys; i++) {
            var kf = {
                index: i,
                time: prop.keyTime(i),
                value: prop.keyValue(i)
            };
            try {
                kf.inInterpolation = prop.keyInInterpolationType(i);
                kf.outInterpolation = prop.keyOutInterpolationType(i);
            } catch (e) { }
            try {
                kf.inSpatialTangent = prop.keyInSpatialTangent(i);
                kf.outSpatialTangent = prop.keyOutSpatialTangent(i);
            } catch (e) { }
            keyframes.push(kf);
        }

        return JSON.stringify({
            status: "success",
            property: args.propertyName,
            layer: { name: layer.name, index: layer.index },
            numKeyframes: prop.numKeys,
            keyframes: keyframes
        });
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() });
    }
}

/** P3: Remove a keyframe */
function removeKeyframe(args) {
    try {
        var comp = resolveComp(args);
        var layer = resolveLayer(comp, args);

        var prop = null;
        try { prop = layer.property("Transform").property(args.propertyName); } catch (e) { }
        if (!prop) try { prop = layer.property(args.propertyName); } catch (e) { }
        if (!prop) throw new Error("Property '" + args.propertyName + "' not found");

        if (args.keyframeIndex) {
            var idx = parseInt(args.keyframeIndex);
            if (idx < 1 || idx > prop.numKeys) throw new Error("Keyframe index " + idx + " out of range");
            prop.removeKey(idx);
        } else if (args.time !== undefined) {
            var nearestIdx = prop.nearestKeyIndex(parseFloat(args.time));
            if (Math.abs(prop.keyTime(nearestIdx) - parseFloat(args.time)) < 0.01) {
                prop.removeKey(nearestIdx);
            } else {
                throw new Error("No keyframe found at time " + args.time + "s");
            }
        } else {
            throw new Error("Provide keyframeIndex or time");
        }

        return JSON.stringify({
            status: "success",
            message: "Keyframe removed from '" + args.propertyName + "' on layer '" + layer.name + "'.",
            remainingKeyframes: prop.numKeys
        });
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() });
    }
}

// =====================================================
// PRIORITY 4 TOOLS - Masks and Track Mattes
// =====================================================

/** P4: Add a mask to a layer */
function addMask(args) {
    try {
        var comp = resolveComp(args);
        var layer = resolveLayer(comp, args);
        var maskGroup = layer.property("Masks");
        var newMask = maskGroup.addProperty("Mask");

        // Set mask shape
        var shape = new Shape();
        if (args.maskShape === "rectangle") {
            var cx = args.position ? args.position[0] : comp.width / 2;
            var cy = args.position ? args.position[1] : comp.height / 2;
            var w = args.size ? args.size[0] : comp.width;
            var h = args.size ? args.size[1] : comp.height;
            shape.vertices = [[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2]];
            shape.closed = true;
        } else if (args.maskShape === "ellipse") {
            // Approximate ellipse with bezier
            var cx2 = args.position ? args.position[0] : comp.width / 2;
            var cy2 = args.position ? args.position[1] : comp.height / 2;
            var rx = args.size ? args.size[0] / 2 : comp.width / 2;
            var ry = args.size ? args.size[1] / 2 : comp.height / 2;
            var k = 0.5522847498; // magic number for circle approximation
            shape.vertices = [[cx2, cy2 - ry], [cx2 + rx, cy2], [cx2, cy2 + ry], [cx2 - rx, cy2]];
            shape.inTangents = [[-rx * k, 0], [0, -ry * k], [rx * k, 0], [0, ry * k]];
            shape.outTangents = [[rx * k, 0], [0, ry * k], [-rx * k, 0], [0, -ry * k]];
            shape.closed = true;
        } else if (args.maskShape === "path" && args.vertices) {
            shape.vertices = args.vertices;
            shape.closed = true;
        }
        newMask.property("Mask Path").setValue(shape);

        // Set mask properties
        if (args.feather !== undefined) newMask.property("Mask Feather").setValue([args.feather, args.feather]);
        if (args.opacity !== undefined) newMask.property("Mask Opacity").setValue(args.opacity);
        if (args.inverted !== undefined) newMask.inverted = args.inverted;

        // Mask mode
        if (args.mode) {
            var modeMap = {
                "add": MaskMode.ADD, "subtract": MaskMode.SUBTRACT,
                "intersect": MaskMode.INTERSECT, "lighten": MaskMode.LIGHTEN,
                "darken": MaskMode.DARKEN, "difference": MaskMode.DIFFERENCE
            };
            if (modeMap[args.mode]) newMask.maskMode = modeMap[args.mode];
        }

        return JSON.stringify({
            status: "success",
            message: "Mask added to layer '" + layer.name + "'.",
            mask: { index: newMask.propertyIndex, shape: args.maskShape }
        });
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() });
    }
}

/** P4: Set track matte type */
function setTrackMatte(args) {
    try {
        var comp = resolveComp(args);
        var layer = resolveLayer(comp, args);
        var matteMap = {
            "none": TrackMatteType.NO_TRACK_MATTE,
            "alpha": TrackMatteType.ALPHA,
            "alphaInverted": TrackMatteType.ALPHA_INVERTED,
            "luma": TrackMatteType.LUMA,
            "lumaInverted": TrackMatteType.LUMA_INVERTED
        };
        var matte = matteMap[args.matteType];
        if (matte === undefined) throw new Error("Unknown matte type: " + args.matteType);
        layer.trackMatteType = matte;

        return JSON.stringify({
            status: "success",
            message: "Track matte set to '" + args.matteType + "' on layer '" + layer.name + "'.",
            layer: { name: layer.name, index: layer.index, trackMatteType: args.matteType }
        });
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() });
    }
}

// =====================================================
// PRIORITY 5 TOOLS - Project and Asset Management
// =====================================================

/** P5: Import a file */
function importFile(args) {
    try {
        var file = new File(args.filePath);
        if (!file.exists) throw new Error("File not found: " + args.filePath);

        var importOptions = new ImportOptions(file);
        if (args.importAs === "composition") {
            importOptions.importAs = ImportAsType.COMP;
        } else if (args.importAs === "project") {
            importOptions.importAs = ImportAsType.PROJECT;
        } else {
            importOptions.importAs = ImportAsType.FOOTAGE;
        }

        var imported = app.project.importFile(importOptions);

        var result = {
            status: "success",
            message: "File imported: " + imported.name,
            item: { id: imported.id, name: imported.name, type: (imported instanceof CompItem) ? "composition" : "footage" }
        };
        if (imported.width) result.item.width = imported.width;
        if (imported.height) result.item.height = imported.height;
        if (imported.duration) result.item.duration = imported.duration;

        return JSON.stringify(result);
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() });
    }
}

/** P5: Add project item as layer */
function addLayerFromItem(args) {
    try {
        var comp = resolveComp(args);
        var itemId = parseInt(args.itemId);
        var item = null;

        for (var i = 1; i <= app.project.numItems; i++) {
            if (app.project.item(i).id === itemId) {
                item = app.project.item(i);
                break;
            }
        }
        if (!item) throw new Error("Project item with ID " + itemId + " not found.");

        var newLayer = comp.layers.add(item);
        if (args.startTime !== undefined) newLayer.startTime = args.startTime;
        if (args.atIndex && args.atIndex !== newLayer.index) {
            if (args.atIndex < newLayer.index) {
                newLayer.moveBefore(comp.layer(args.atIndex));
            } else {
                newLayer.moveAfter(comp.layer(args.atIndex));
            }
        }

        return JSON.stringify({
            status: "success",
            message: "Added '" + item.name + "' as layer in comp '" + comp.name + "'.",
            layer: { name: newLayer.name, index: newLayer.index }
        });
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() });
    }
}

/** P5: Precompose layers */
function precomposeLayers(args) {
    try {
        var comp = resolveComp(args);
        var indices = args.layerIndices;
        var name = args.name || "Precomp";
        var moveAttrs = (args.moveAttributes !== false); // default true

        // Validate indices
        for (var i = 0; i < indices.length; i++) {
            if (indices[i] < 1 || indices[i] > comp.numLayers) {
                throw new Error("Layer index " + indices[i] + " out of range.");
            }
        }

        var precomp = comp.layers.precompose(indices, name, moveAttrs);

        return JSON.stringify({
            status: "success",
            message: "Precomposed " + indices.length + " layers into '" + name + "'.",
            precomp: { name: precomp.name, id: precomp.id, numLayers: precomp.numLayers }
        });
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() });
    }
}

/** P5: Duplicate a layer */
function duplicateLayer(args) {
    try {
        var comp = resolveComp(args);
        var layer = resolveLayer(comp, args);
        var newLayer = layer.duplicate();

        return JSON.stringify({
            status: "success",
            message: "Layer '" + layer.name + "' duplicated.",
            newLayer: { name: newLayer.name, index: newLayer.index },
            originalLayer: { name: layer.name, index: layer.index }
        });
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() });
    }
}

/** P5: Get active composition info */
function getActiveComp(args) {
    try {
        if (!(app.project.activeItem instanceof CompItem)) {
            return errorEnvelope(
                "getActiveComp",
                "NO_ACTIVE_COMP",
                "No active composition.",
                "Open a composition in the viewer or provide compName/compIndex to tools that support it.",
                { recovery: "Create one using create-composition if needed." }
            );
        }

        var comp = app.project.activeItem;
        return successEnvelope("getActiveComp", {
            composition: {
                id: comp.id,
                name: comp.name,
                width: comp.width,
                height: comp.height,
                duration: comp.duration,
                frameRate: comp.frameRate,
                numLayers: comp.numLayers
            }
        });
    } catch (error) {
        return errorEnvelope("getActiveComp", "ACTIVE_COMP_LOOKUP_FAILED", "Failed to resolve active composition.", error.toString());
    }
}

/** P5: Save project */
function saveProject(args) {
    try {
        if (!app.project) {
            return errorResponse("No open project to save.", "NO_PROJECT_OPEN");
        }

        if (args && args.saveAsPath) {
            var saveFile = new File(args.saveAsPath);
            app.project.save(saveFile);
            return JSON.stringify({
                status: "success",
                message: "Project saved.",
                path: saveFile.fsName
            });
        }

        if (!app.project.file) {
            return errorResponse(
                "Project has not been saved yet.",
                "PROJECT_SAVE_PATH_REQUIRED",
                "Use saveAsPath for first-time save.",
                "Call save-project with saveAsPath='/absolute/path/project.aep'."
            );
        }

        app.project.save();
        return JSON.stringify({
            status: "success",
            message: "Project saved.",
            path: app.project.file.fsName
        });
    } catch (error) {
        return errorResponse("Failed to save project: " + error.toString(), "PROJECT_SAVE_FAILED");
    }
}

/** P5: Open project */
function openProject(args) {
    try {
        if (!args || !args.filePath) {
            return errorResponse("filePath is required.", "PROJECT_OPEN_PATH_REQUIRED");
        }

        var file = new File(args.filePath);
        if (!file.exists) {
            return errorResponse("Project file not found: " + args.filePath, "PROJECT_OPEN_NOT_FOUND");
        }

        if (app.project && app.project.numItems > 0 && args.closeCurrent !== true) {
            return errorResponse(
                "Refusing to replace current project context without explicit closeCurrent=true.",
                "PROJECT_OPEN_REQUIRES_CONFIRMATION",
                "Opening another project is context-destructive.",
                "Call open-project again with closeCurrent=true."
            );
        }

        app.open(file);
        return JSON.stringify({
            status: "success",
            message: "Project opened.",
            path: file.fsName,
            projectName: app.project ? app.project.file.name : null
        });
    } catch (error) {
        return errorResponse("Failed to open project: " + error.toString(), "PROJECT_OPEN_FAILED");
    }
}

// =====================================================
// PRIORITY 6 TOOLS - Rendering and Output
// =====================================================

/** P6: Add comp to render queue */
function addToRenderQueue(args) {
    try {
        var comp = resolveComp(args);
        var rqItem = app.project.renderQueue.items.add(comp);

        if (args.outputPath) {
            var outputModule = rqItem.outputModule(1);
            var file = new File(args.outputPath);
            outputModule.file = file;
        }

        return JSON.stringify({
            status: "success",
            message: "Composition '" + comp.name + "' added to render queue.",
            renderQueueItem: { index: rqItem.index, status: rqItem.status }
        });
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() });
    }
}

/** P6: Start rendering */
function startRender(args) {
    try {
        var rq = app.project.renderQueue;
        if (rq.numItems === 0) throw new Error("Render queue is empty.");

        rq.render();

        return JSON.stringify({
            status: "success",
            message: "Render completed."
        });
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() });
    }
}

/** P6: Capture a frame */
function captureFrame(args) {
    try {
        var comp = resolveComp(args);
        var time = (args.time !== undefined) ? args.time : comp.time;
        var format = args.format || "png";
        var outputPath = args.outputPath;

        if (!outputPath) throw new Error("outputPath is required.");

        // Map format to best available template
        var templateMap = {
            "png": ["PNG Sequence", "TIFF Sequence with Alpha", "Photoshop", "Lossless with Alpha"],
            "jpg": ["JPEG Sequence", "TIFF Sequence with Alpha", "Photoshop"],
            "tiff": ["TIFF Sequence with Alpha"],
            "psd": ["Photoshop"]
        };

        // Set composition time
        comp.time = time;

        // Use render queue
        var rqItem = app.project.renderQueue.items.add(comp);
        var om = rqItem.outputModule(1);
        
        // Get all available templates
        var templates = om.templates;
        var allTemplates = [];
        for (var t = 0; t < templates.length; t++) {
            allTemplates.push(templates[t]);
        }

        // Find best matching template
        var targetTemplates = templateMap[format] || templateMap["png"];
        var applied = false;
        var appliedName = null;
        
        for (var i = 0; i < targetTemplates.length && !applied; i++) {
            var target = targetTemplates[i];
            for (var j = 0; j < templates.length; j++) {
                var tName = templates[j];
                if (tName === target || tName.toLowerCase().indexOf(target.toLowerCase()) !== -1) {
                    try {
                        om.applyTemplate(tName);
                        applied = true;
                        appliedName = tName;
                        break;
                    } catch (e) {}
                }
            }
        }

        // Update extension based on template used
        if (appliedName) {
            if (appliedName.indexOf("TIFF") !== -1) {
                outputPath = outputPath.replace(/\.[^.]+$/, ".tif");
                format = "tiff";
            } else if (appliedName.indexOf("Photoshop") !== -1) {
                outputPath = outputPath.replace(/\.[^.]+$/, ".psd");
                format = "psd";
            }
        }

        // Set output file
        om.file = new File(outputPath);

        // Set to single frame
        rqItem.timeSpanStart = time;
        rqItem.timeSpanDuration = 1 / comp.frameRate;

        // Render
        app.project.renderQueue.render();

        // Clean up
        try { rqItem.remove(); } catch (e) {}

        // Check for sequence file (AE adds [#####] for sequences)
        var actualPath = outputPath;
        var baseName = outputPath.replace(/\.[^.]+$/, "");
        var ext = outputPath.split('.').pop();
        
        // Try different sequence naming patterns
        var patterns = [
            baseName + "00000." + ext,
            baseName + "[00000]." + ext,
            baseName + "0000." + ext,
            baseName + "001." + ext
        ];
        
        for (var p = 0; p < patterns.length; p++) {
            var seqFile = new File(patterns[p]);
            if (seqFile.exists) {
                actualPath = seqFile.fsName;
                break;
            }
        }

        return JSON.stringify({
            status: "success",
            message: "Frame captured at " + time + "s using " + (appliedName || "default") + " template.",
            output: { path: actualPath, time: time, format: format },
            appliedTemplate: appliedName
        });
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() });
    }
}

// =====================================================
// PRIORITY 7 TOOLS - Quality of Life
// =====================================================

/** P7: Execute a batch of operations in a single call */
function executeBatch(args) {
    try {
        var operations = args.operations;
        if (!operations || operations.length === 0) throw new Error("No operations provided.");

        var results = [];
        for (var i = 0; i < operations.length; i++) {
            var op = operations[i];
            var requestedTool = op.tool;
            var normalizedTool = normalizeBatchCommand(requestedTool);
            try {
                var opResult = executeSingleCommand(normalizedTool, op.parameters || {});
                results.push({
                    index: i,
                    tool: requestedTool,
                    normalizedTool: normalizedTool,
                    status: "success",
                    result: JSON.parse(opResult)
                });
            } catch (e) {
                results.push({
                    index: i,
                    tool: requestedTool,
                    normalizedTool: normalizedTool,
                    status: "error",
                    message: e.toString()
                });
            }
        }

        return JSON.stringify({
            status: "success",
            message: "Batch executed: " + operations.length + " operations.",
            results: results
        });
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() });
    }
}

/** Helper: execute a single command (used by executeBatch) */
function executeSingleCommand(command, args) {
    switch (command) {
        case "createComposition": return createComposition(args);
        case "createTextLayer": return createTextLayer(args);
        case "createShapeLayer": return createShapeLayer(args);
        case "createSolidLayer": return createSolidLayer(args);
        case "setLayerProperties": return setLayerProperties(args);
        case "setLayerKeyframe": return setLayerKeyframe(args);
        case "setLayerExpression": return setLayerExpression(args);
        case "applyEffect": return applyEffect(args);
        case "applyEffectTemplate": return applyEffectTemplate(args);
        case "moveLayer": return moveLayer(args);
        case "renameLayer": return renameLayer(args);
        case "setLayerVisibility": return setLayerVisibility(args);
        case "deleteLayer": return deleteLayer(args);
        case "setBlendingMode": return setBlendingMode(args);
        case "setLayerParent": return setLayerParent(args);
        case "createNullObject": return createNullObject(args);
        case "createAdjustmentLayer": return createAdjustmentLayer(args);
        case "getLayerEffects": return getLayerEffects(args);
        case "getEffectProperties": return getEffectProperties(args);
        case "setEffectProperty": return setEffectProperty(args);
        case "removeEffect": return removeEffect(args);
        case "getKeyframes": return getKeyframes(args);
        case "removeKeyframe": return removeKeyframe(args);
        case "addMask": return addMask(args);
        case "setTrackMatte": return setTrackMatte(args);
        case "duplicateLayer": return duplicateLayer(args);
        case "importFile": return importFile(args);
        case "addLayerFromItem": return addLayerFromItem(args);
        case "precomposeLayers": return precomposeLayers(args);
        case "setTextProperties": return setTextProperties(args);
        case "getTextProperties": return getTextProperties(args);
        case "modifyShapePath": return modifyShapePath(args);
        case "setShapeColors": return setShapeColors(args);
        case "addShapeGroup": return addShapeGroup(args);
        case "createCamera": return createCamera(args);
        case "createLight": return createLight(args);
        case "addMarker": return addMarker(args);
        case "getMarkers": return getMarkers(args);
        case "removeMarker": return removeMarker(args);
        case "setTimeRemapping": return setTimeRemapping(args);
        case "setMotionBlur": return setMotionBlur(args);
        case "setFrameBlending": return setFrameBlending(args);
        case "searchTextLayers": return searchTextLayers(args);
        case "getActiveComp": return getActiveComp(args);
        case "saveProject": return saveProject(args);
        case "openProject": return openProject(args);
        case "inspectPropertyTree": return inspectPropertyTree(args);
        case "listProjectItems": return listProjectItems(args);
        case "getProjectItemInfo": return getProjectItemInfo(args);
        case "getCompositionSettings": return getCompositionSettings(args);
        case "getPropertyMetadata": return getPropertyMetadata(args);
        case "getPropertyValue": return getPropertyValue(args);
        case "setPropertyValue": return setPropertyValue(args);
        case "getExpression": return getExpression(args);
        case "bridgeHealth": return bridgeHealth(args);
        default: return errorResponse(
            "Unknown batch command: " + command,
            "BATCH_UNKNOWN_COMMAND",
            "Use kebab-case public names (for example: apply-effect) or legacy camelCase names.",
            "Call get-help for examples of supported commands."
        );
    }
}

/** P7: Undo */
function undoOperation(args) {
    try {
        var steps = (args && args.steps) ? parseInt(args.steps) : 1;
        for (var i = 0; i < steps; i++) {
            app.executeCommand(16); // Edit > Undo
        }
        return JSON.stringify({
            status: "success",
            message: "Undone " + steps + " step(s)."
        });
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() });
    }
}

/** P7: Redo */
function redoOperation(args) {
    try {
        var steps = (args && args.steps) ? parseInt(args.steps) : 1;
        for (var i = 0; i < steps; i++) {
            app.executeCommand(17); // Edit > Redo
        }
        return JSON.stringify({
            status: "success",
            message: "Redone " + steps + " step(s)."
        });
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() });
    }
}

// =====================================================
// PRIORITY 8 TOOLS - Advanced Features
// =====================================================

// --- 8.1: Text Layer Property Control ---

/** P8: Set text document properties */
function setTextProperties(args) {
    try {
        var comp = resolveComp(args);
        var layer = resolveLayer(comp, args);
        if (!(layer instanceof TextLayer)) throw new Error("Layer '" + layer.name + "' is not a text layer.");

        var sourceTextProp = layer.property("Source Text");
        var doc = sourceTextProp.value;
        var changed = [];

        if (args.text !== undefined) { doc.text = args.text; changed.push("text"); }
        if (args.fontFamily !== undefined) { doc.font = args.fontFamily; changed.push("fontFamily"); }
        if (args.fontSize !== undefined) { doc.fontSize = args.fontSize; changed.push("fontSize"); }
        if (args.fillColor !== undefined) { doc.fillColor = args.fillColor; changed.push("fillColor"); }
        if (args.strokeColor !== undefined) { doc.strokeColor = args.strokeColor; changed.push("strokeColor"); }
        if (args.strokeWidth !== undefined) { doc.strokeWidth = args.strokeWidth; changed.push("strokeWidth"); }
        if (args.tracking !== undefined) { doc.tracking = args.tracking; changed.push("tracking"); }
        if (args.leading !== undefined) { doc.leading = args.leading; changed.push("leading"); }
        if (args.applyStroke !== undefined) { doc.applyStroke = args.applyStroke; changed.push("applyStroke"); }
        if (args.applyFill !== undefined) { doc.applyFill = args.applyFill; changed.push("applyFill"); }
        if (args.justification !== undefined) {
            var justMap = {
                "left": ParagraphJustification.LEFT_JUSTIFY,
                "center": ParagraphJustification.CENTER_JUSTIFY,
                "right": ParagraphJustification.RIGHT_JUSTIFY,
                "full": ParagraphJustification.FULL_JUSTIFY_LASTLINE_LEFT
            };
            if (justMap[args.justification]) {
                doc.justification = justMap[args.justification];
                changed.push("justification");
            }
        }

        sourceTextProp.setValue(doc);

        return JSON.stringify({
            status: "success",
            message: "Text properties updated on layer '" + layer.name + "'.",
            changedProperties: changed
        });
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() });
    }
}

/** P8: Get text document properties */
function getTextProperties(args) {
    try {
        var comp = resolveComp(args);

        // Batch mode: return text from multiple layers
        if (args.layerIndices && args.layerIndices.length > 0) {
            var results = [];
            for (var n = 0; n < args.layerIndices.length; n++) {
                try {
                    var bLayer = comp.layer(args.layerIndices[n]);
                    if (bLayer instanceof TextLayer) {
                        var bDoc = bLayer.property("Source Text").value;
                        results.push({
                            index: bLayer.index,
                            name: bLayer.name,
                            text: bDoc.text,
                            font: bDoc.font,
                            fontSize: bDoc.fontSize,
                            fillColor: bDoc.fillColor
                        });
                    }
                } catch(e) { /* skip invalid indices */ }
            }
            return JSON.stringify({ status: "success", textLayers: results });
        }

        // Single-layer mode (existing behavior)
        var layer = resolveLayer(comp, args);
        if (!(layer instanceof TextLayer)) throw new Error("Layer '" + layer.name + "' is not a text layer.");

        var doc = layer.property("Source Text").value;
        var result = {
            text: doc.text,
            font: doc.font,
            fontSize: doc.fontSize,
            fillColor: doc.fillColor,
            applyFill: doc.applyFill
        };
        try { result.strokeColor = doc.strokeColor; } catch (e) { }
        try { result.strokeWidth = doc.strokeWidth; } catch (e) { }
        try { result.applyStroke = doc.applyStroke; } catch (e) { }
        try { result.tracking = doc.tracking; } catch (e) { }
        try { result.leading = doc.leading; } catch (e) { }
        try {
            var justRev = {};
            justRev[ParagraphJustification.LEFT_JUSTIFY] = "left";
            justRev[ParagraphJustification.CENTER_JUSTIFY] = "center";
            justRev[ParagraphJustification.RIGHT_JUSTIFY] = "right";
            justRev[ParagraphJustification.FULL_JUSTIFY_LASTLINE_LEFT] = "full";
            result.justification = justRev[doc.justification] || "unknown";
        } catch (e) { }

        return JSON.stringify({
            status: "success",
            layer: { name: layer.name, index: layer.index },
            textProperties: result
        });
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() });
    }
}

// --- 8.2: Shape Layer Path Control ---

/** P8: Modify shape path */
function modifyShapePath(args) {
    try {
        var comp = resolveComp(args);
        var layer = resolveLayer(comp, args);
        if (!(layer instanceof ShapeLayer)) throw new Error("Layer '" + layer.name + "' is not a shape layer.");

        var contents = layer.property("Contents");
        var group = null;
        if (args.shapeGroupIndex) {
            group = contents.property(parseInt(args.shapeGroupIndex));
        } else if (args.shapeGroupName) {
            group = contents.property(args.shapeGroupName);
        } else {
            group = contents.property(1);
        }
        if (!group) throw new Error("Shape group not found.");

        // Find the path property within the group
        var groupContents = group.property("Contents");
        var pathProp = null;
        for (var i = 1; i <= groupContents.numProperties; i++) {
            var p = groupContents.property(i);
            if (p.matchName === "ADBE Vector Shape - Group" || p.matchName === "ADBE Vector Shape") {
                pathProp = p.property("Path");
                break;
            }
        }
        if (!pathProp) throw new Error("No path found in shape group.");

        var shape = pathProp.value;
        if (args.vertices) shape.vertices = args.vertices;
        if (args.inTangents) shape.inTangents = args.inTangents;
        if (args.outTangents) shape.outTangents = args.outTangents;
        if (args.closed !== undefined) shape.closed = args.closed;
        pathProp.setValue(shape);

        return JSON.stringify({
            status: "success",
            message: "Shape path modified on layer '" + layer.name + "'."
        });
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() });
    }
}

/** P8: Set shape fill/stroke colors */
function setShapeColors(args) {
    try {
        var comp = resolveComp(args);
        var layer = resolveLayer(comp, args);
        if (!(layer instanceof ShapeLayer)) throw new Error("Layer '" + layer.name + "' is not a shape layer.");

        var contents = layer.property("Contents");
        var group = null;
        if (args.shapeGroupIndex) {
            group = contents.property(parseInt(args.shapeGroupIndex));
        } else if (args.shapeGroupName) {
            group = contents.property(args.shapeGroupName);
        } else {
            group = contents.property(1);
        }
        if (!group) throw new Error("Shape group not found.");

        var groupContents = group.property("Contents");
        var changed = [];

        // Find fill and stroke
        for (var i = 1; i <= groupContents.numProperties; i++) {
            var p = groupContents.property(i);
            if (p.matchName === "ADBE Vector Graphic - Fill") {
                if (args.fillColor) { p.property("Color").setValue(args.fillColor); changed.push("fillColor"); }
                if (args.fillOpacity !== undefined) { p.property("Opacity").setValue(args.fillOpacity); changed.push("fillOpacity"); }
            }
            if (p.matchName === "ADBE Vector Graphic - Stroke") {
                if (args.strokeColor) { p.property("Color").setValue(args.strokeColor); changed.push("strokeColor"); }
                if (args.strokeWidth !== undefined) { p.property("Stroke Width").setValue(args.strokeWidth); changed.push("strokeWidth"); }
                if (args.strokeOpacity !== undefined) { p.property("Opacity").setValue(args.strokeOpacity); changed.push("strokeOpacity"); }
            }
        }

        return JSON.stringify({
            status: "success",
            message: "Shape colors updated on layer '" + layer.name + "'.",
            changedProperties: changed
        });
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() });
    }
}

/** P8: Add a shape group to an existing shape layer */
function addShapeGroup(args) {
    try {
        var comp = resolveComp(args);
        var layer = resolveLayer(comp, args);
        if (!(layer instanceof ShapeLayer)) throw new Error("Layer '" + layer.name + "' is not a shape layer.");

        var contents = layer.property("Contents");
        var shapeGroup = contents.addProperty("ADBE Vector Group");
        var groupContents = shapeGroup.property("Contents");

        // Create shape based on type
        var size = args.size || [200, 200];
        if (args.shapeType === "rectangle") {
            var rect = groupContents.addProperty("ADBE Vector Shape - Rect");
            rect.property("Size").setValue(size);
        } else if (args.shapeType === "ellipse") {
            var ellip = groupContents.addProperty("ADBE Vector Shape - Ellipse");
            ellip.property("Size").setValue(size);
        } else if (args.shapeType === "polygon" || args.shapeType === "star") {
            var star = groupContents.addProperty("ADBE Vector Shape - Star");
            star.property("Type").setValue(args.shapeType === "polygon" ? 1 : 2);
            if (args.points) star.property("Points").setValue(args.points);
            if (args.outerRadius) star.property("Outer Radius").setValue(args.outerRadius);
            if (args.innerRadius && args.shapeType === "star") star.property("Inner Radius").setValue(args.innerRadius);
        } else if (args.shapeType === "path" && args.vertices) {
            var pathItem = groupContents.addProperty("ADBE Vector Shape - Group");
            var shape = new Shape();
            shape.vertices = args.vertices;
            shape.closed = true;
            pathItem.property("Path").setValue(shape);
        }

        // Add fill
        if (args.fillColor) {
            var fill = groupContents.addProperty("ADBE Vector Graphic - Fill");
            fill.property("Color").setValue(args.fillColor);
        }
        // Add stroke
        if (args.strokeColor || args.strokeWidth) {
            var stroke = groupContents.addProperty("ADBE Vector Graphic - Stroke");
            if (args.strokeColor) stroke.property("Color").setValue(args.strokeColor);
            if (args.strokeWidth) stroke.property("Stroke Width").setValue(args.strokeWidth);
        }

        // Position
        if (args.position) {
            shapeGroup.property("Transform").property("Position").setValue(args.position);
        }

        return JSON.stringify({
            status: "success",
            message: "Shape group '" + args.shapeType + "' added to layer '" + layer.name + "'.",
            shapeGroup: { index: shapeGroup.propertyIndex, name: shapeGroup.name }
        });
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() });
    }
}

// --- 8.3: Camera and Light Layers ---

/** P8: Create camera layer */
function createCamera(args) {
    try {
        var comp = resolveComp(args);
        var name = args.name || "Camera";
        var centerPoint = [comp.width / 2, comp.height / 2];

        var camLayer = comp.layers.addCamera(name, centerPoint);

        // Camera type: one-node vs two-node
        // AE creates two-node by default; for one-node, remove point of interest
        if (args.type === "oneNode") {
            camLayer.autoOrient = AutoOrientType.NO_AUTO_ORIENT;
        }

        if (args.zoom) {
            try { camLayer.property("Camera Options").property("Zoom").setValue(args.zoom); } catch (e) { }
        }
        if (args.position) {
            camLayer.property("Position").setValue(args.position);
        }
        if (args.pointOfInterest) {
            try { camLayer.property("Point of Interest").setValue(args.pointOfInterest); } catch (e) { }
        }

        return JSON.stringify({
            status: "success",
            message: "Camera '" + camLayer.name + "' created.",
            layer: { name: camLayer.name, index: camLayer.index, type: "camera" }
        });
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() });
    }
}

/** P8: Create light layer */
function createLight(args) {
    try {
        var comp = resolveComp(args);
        var name = args.name || "Light";
        var centerPoint = [comp.width / 2, comp.height / 2];

        var lightLayer = comp.layers.addLight(name, centerPoint);

        // Set light type
        if (args.lightType) {
            var typeMap = {
                "point": LightType.POINT,
                "spot": LightType.SPOT,
                "ambient": LightType.AMBIENT,
                "parallel": LightType.PARALLEL
            };
            if (typeMap[args.lightType]) {
                lightLayer.lightType = typeMap[args.lightType];
            }
        }

        // Set properties
        if (args.color) {
            try { lightLayer.property("Light Options").property("Color").setValue(args.color); } catch (e) { }
        }
        if (args.intensity !== undefined) {
            try { lightLayer.property("Light Options").property("Intensity").setValue(args.intensity); } catch (e) { }
        }
        if (args.position) {
            lightLayer.property("Position").setValue(args.position);
        }
        if (args.coneAngle !== undefined) {
            try { lightLayer.property("Light Options").property("Cone Angle").setValue(args.coneAngle); } catch (e) { }
        }
        if (args.coneFeather !== undefined) {
            try { lightLayer.property("Light Options").property("Cone Feather").setValue(args.coneFeather); } catch (e) { }
        }

        return JSON.stringify({
            status: "success",
            message: "Light '" + lightLayer.name + "' created.",
            layer: { name: lightLayer.name, index: lightLayer.index, type: "light", lightType: args.lightType || "point" }
        });
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() });
    }
}

// --- 8.4: Markers ---

/** P8: Add marker */
function addMarker(args) {
    try {
        var comp = resolveComp(args);
        var markerValue = new MarkerValue(args.comment || "");

        if (args.chapter) markerValue.chapter = args.chapter;
        if (args.url) markerValue.url = args.url;
        if (args.duration) markerValue.duration = args.duration;
        if (args.label !== undefined) markerValue.label = args.label;

        var markersProp;
        if (args.isCompMarker) {
            markersProp = comp.markerProperty;
        } else {
            var layer = resolveLayer(comp, args);
            markersProp = layer.property("Marker");
        }

        markersProp.setValueAtTime(args.time, markerValue);

        return JSON.stringify({
            status: "success",
            message: "Marker added at " + args.time + "s.",
            marker: { time: args.time, comment: args.comment || "", chapter: args.chapter || "" }
        });
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() });
    }
}

/** P8: Get markers */
function getMarkers(args) {
    try {
        var comp = resolveComp(args);
        var markersProp;
        var source = "composition";

        if (args.isCompMarker) {
            markersProp = comp.markerProperty;
        } else {
            var layer = resolveLayer(comp, args);
            markersProp = layer.property("Marker");
            source = "layer '" + layer.name + "'";
        }

        var markers = [];
        for (var i = 1; i <= markersProp.numKeys; i++) {
            var mv = markersProp.keyValue(i);
            markers.push({
                index: i,
                time: markersProp.keyTime(i),
                comment: mv.comment,
                chapter: mv.chapter,
                url: mv.url,
                duration: mv.duration,
                label: mv.label
            });
        }

        return JSON.stringify({
            status: "success",
            source: source,
            numMarkers: markers.length,
            markers: markers
        });
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() });
    }
}

/** P8: Remove marker */
function removeMarker(args) {
    try {
        var comp = resolveComp(args);
        var markersProp;

        if (args.isCompMarker) {
            markersProp = comp.markerProperty;
        } else {
            var layer = resolveLayer(comp, args);
            markersProp = layer.property("Marker");
        }

        if (args.markerIndex) {
            var idx = parseInt(args.markerIndex);
            if (idx < 1 || idx > markersProp.numKeys) throw new Error("Marker index " + idx + " out of range.");
            markersProp.removeKey(idx);
        } else if (args.time !== undefined) {
            var nearIdx = markersProp.nearestKeyIndex(parseFloat(args.time));
            if (Math.abs(markersProp.keyTime(nearIdx) - parseFloat(args.time)) < 0.05) {
                markersProp.removeKey(nearIdx);
            } else {
                throw new Error("No marker found near time " + args.time + "s.");
            }
        } else {
            throw new Error("Provide markerIndex or time.");
        }

        return JSON.stringify({
            status: "success",
            message: "Marker removed.",
            remainingMarkers: markersProp.numKeys
        });
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() });
    }
}

// --- 8.5: Time Remapping ---

/** P8: Set time remapping */
function setTimeRemapping(args) {
    try {
        var comp = resolveComp(args);
        var layer = resolveLayer(comp, args);

        if (args.enabled) {
            layer.timeRemapEnabled = true;
            if (args.keyframes) {
                var trProp = layer.property("Time Remap");
                for (var i = 0; i < args.keyframes.length; i++) {
                    trProp.setValueAtTime(args.keyframes[i].time, args.keyframes[i].value);
                }
            }
        } else {
            layer.timeRemapEnabled = false;
        }

        return JSON.stringify({
            status: "success",
            message: "Time remapping " + (args.enabled ? "enabled" : "disabled") + " on layer '" + layer.name + "'.",
            layer: { name: layer.name, index: layer.index, timeRemapEnabled: layer.timeRemapEnabled }
        });
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() });
    }
}

// --- 8.6: Motion Blur and Frame Blending ---

/** P8: Set motion blur */
function setMotionBlur(args) {
    try {
        var comp = resolveComp(args);
        var changed = [];

        if (args.compMotionBlur !== undefined) {
            comp.motionBlur = args.compMotionBlur;
            changed.push("compMotionBlur=" + args.compMotionBlur);
        }

        if (args.layerMotionBlur !== undefined) {
            var layer = resolveLayer(comp, args);
            layer.motionBlur = args.layerMotionBlur;
            changed.push("layerMotionBlur=" + args.layerMotionBlur + " on '" + layer.name + "'");
        }

        return JSON.stringify({
            status: "success",
            message: "Motion blur settings updated: " + changed.join(", ")
        });
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() });
    }
}

/** P8: Set frame blending */
function setFrameBlending(args) {
    try {
        var comp = resolveComp(args);
        var changed = [];

        if (args.compFrameBlending !== undefined) {
            comp.frameBlending = args.compFrameBlending;
            changed.push("compFrameBlending=" + args.compFrameBlending);
        }

        if (args.mode) {
            var layer = resolveLayer(comp, args);
            var modeMap = {
                "none": FrameBlendingType.NO_FRAME_BLEND,
                "frameBlending": FrameBlendingType.FRAME_MIX,
                "pixelMotion": FrameBlendingType.PIXEL_MOTION
            };
            if (modeMap[args.mode]) {
                layer.frameBlendingType = modeMap[args.mode];
                changed.push("frameBlending='" + args.mode + "' on '" + layer.name + "'");
            }
        }

        return JSON.stringify({
            status: "success",
            message: "Frame blending updated: " + changed.join(", ")
        });
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() });
    }
}

// --- End of All Function Definitions ---

// --- Bridge test function to verify communication and effects application ---
function bridgeTestEffects(args) {
    try {
        // Use shared resolvers - will use active comp if no compIndex/compName provided
        var comp = resolveComp(args || {});
        var layer = resolveLayer(comp, args || {});

        // Apply a light Gaussian Blur
        var blurRes = JSON.parse(applyEffect({
            compIndex: comp.id,
            layerIndex: layer.index,
            effectMatchName: "ADBE Gaussian Blur 2",
            effectSettings: { "Blurriness": 5 }
        }));

        // Apply a simple drop shadow via template
        var shadowRes = JSON.parse(applyEffectTemplate({
            compIndex: comp.id,
            layerIndex: layer.index,
            templateName: "drop-shadow"
        }));

        return JSON.stringify({
            status: "success",
            message: "Bridge test effects applied.",
            composition: { name: comp.name, id: comp.id },
            layer: { name: layer.name, index: layer.index },
            results: [blurRes, shadowRes]
        }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

// JSON polyfill for ExtendScript (when JSON is undefined)
if (typeof JSON === "undefined") {
    JSON = {};
}
if (typeof JSON.parse !== "function") {
    JSON.parse = function (text) {
        // Safe-ish fallback for trusted input (our own command file)
        return eval("(" + text + ")");
    };
}
if (typeof JSON.stringify !== "function") {
    (function () {
        function esc(str) {
            return (str + "")
                .replace(/\\/g, "\\\\")
                .replace(/"/g, '\\"')
                .replace(/\n/g, "\\n")
                .replace(/\r/g, "\\r")
                .replace(/\t/g, "\\t");
        }
        function toJSON(val) {
            if (val === null) return "null";
            var t = typeof val;
            if (t === "number" || t === "boolean") return String(val);
            if (t === "string") return '"' + esc(val) + '"';
            if (val instanceof Array) {
                var a = [];
                for (var i = 0; i < val.length; i++) a.push(toJSON(val[i]));
                return "[" + a.join(",") + "]";
            }
            if (t === "object") {
                var props = [];
                for (var k in val) {
                    if (val.hasOwnProperty(k) && typeof val[k] !== "function" && typeof val[k] !== "undefined") {
                        props.push('"' + esc(k) + '":' + toJSON(val[k]));
                    }
                }
                return "{" + props.join(",") + "}";
            }
            return "null";
        }
        JSON.stringify = function (value, _replacer, _space) {
            return toJSON(value);
        };
    })();
}

// Detect AE version (AE 2025 = version 25.x, AE 2026 = version 26.x)
var aeVersion = parseFloat(app.version);
var isAE2025OrLater = aeVersion >= 25.0;

// Always create a floating palette window for AE 2025+
var panel = new Window("palette", "MCP Bridge Auto", undefined);
panel.orientation = "column";
panel.alignChildren = ["fill", "top"];
panel.spacing = 10;
panel.margins = 16;

// Status display
var statusText = panel.add("statictext", undefined, "Waiting for commands...");
statusText.alignment = ["fill", "top"];

// Add log area
var logPanel = panel.add("panel", undefined, "Command Log");
logPanel.orientation = "column";
logPanel.alignChildren = ["fill", "fill"];
var logText = logPanel.add("edittext", undefined, "", { multiline: true, readonly: true });
logText.preferredSize.height = 200;

// AE 2025 warning
if (isAE2025OrLater) {
    var warning = panel.add("statictext", undefined, "AE 2025+: Dockable panels are not supported. Floating window only.");
    warning.graphics.foregroundColor = warning.graphics.newPen(warning.graphics.PenType.SOLID_COLOR, [1, 0.3, 0, 1], 1);
}

// Auto-run checkbox
var autoRunCheckbox = panel.add("checkbox", undefined, "Auto-run commands");
autoRunCheckbox.value = true;

// Check interval (ms)
var checkInterval = 500;
var isChecking = false;

// Command file path - use Documents folder for reliable access
function getCommandFilePath() {
    var userFolder = Folder.myDocuments;
    var bridgeFolder = new Folder(userFolder.fsName + "/ae-mcp-bridge");
    if (!bridgeFolder.exists) {
        bridgeFolder.create();
    }
    return bridgeFolder.fsName + "/ae_command.json";
}

// Result file path - use Documents folder for reliable access
function getResultFilePath() {
    var userFolder = Folder.myDocuments;
    var bridgeFolder = new Folder(userFolder.fsName + "/ae-mcp-bridge");
    if (!bridgeFolder.exists) {
        bridgeFolder.create();
    }
    return bridgeFolder.fsName + "/ae_mcp_result.json";
}

// Functions for each script type
function getProjectInfo() {
    var project = app.project;
    var result = {
        projectName: project.file ? project.file.name : "Untitled Project",
        path: project.file ? project.file.fsName : "",
        numItems: project.numItems,
        bitsPerChannel: project.bitsPerChannel,
        timeMode: project.timeDisplayType === TimeDisplayType.FRAMES ? "Frames" : "Timecode",
        items: []
    };

    // Count item types
    var countByType = {
        compositions: 0,
        footage: 0,
        folders: 0,
        solids: 0
    };

    // Get item information (limited for performance)
    for (var i = 1; i <= Math.min(project.numItems, 50); i++) {
        var item = project.item(i);
        var itemType = "";

        if (item instanceof CompItem) {
            itemType = "Composition";
            countByType.compositions++;
        } else if (item instanceof FolderItem) {
            itemType = "Folder";
            countByType.folders++;
        } else if (item instanceof FootageItem) {
            if (item.mainSource instanceof SolidSource) {
                itemType = "Solid";
                countByType.solids++;
            } else {
                itemType = "Footage";
                countByType.footage++;
            }
        }

        result.items.push({
            id: item.id,
            name: item.name,
            type: itemType
        });
    }

    result.itemCounts = countByType;

    // Include active composition metadata if available
    if (app.project.activeItem instanceof CompItem) {
        var ac = app.project.activeItem;
        result.activeComp = {
            id: ac.id,
            name: ac.name,
            width: ac.width,
            height: ac.height,
            duration: ac.duration,
            frameRate: ac.frameRate,
            numLayers: ac.numLayers
        };
    }

    return JSON.stringify(result, null, 2);
}

function listCompositions() {
    var project = app.project;
    var result = {
        compositions: []
    };

    // Loop through items in the project
    for (var i = 1; i <= project.numItems; i++) {
        var item = project.item(i);

        // Check if the item is a composition
        if (item instanceof CompItem) {
            result.compositions.push({
                id: item.id,
                name: item.name,
                duration: item.duration,
                frameRate: item.frameRate,
                width: item.width,
                height: item.height,
                numLayers: item.numLayers
            });
        }
    }

    return JSON.stringify(result, null, 2);
}

function getLayerInfo() {
    var project = app.project;
    var result = {
        layers: []
    };

    // Get the active composition
    var activeComp = null;
    if (app.project.activeItem instanceof CompItem) {
        activeComp = app.project.activeItem;
    } else {
        return JSON.stringify({ error: "No active composition" }, null, 2);
    }

    // Loop through layers in the active composition
    for (var i = 1; i <= activeComp.numLayers; i++) {
        var layer = activeComp.layer(i);
        var layerInfo = {
            index: layer.index,
            name: layer.name,
            enabled: layer.enabled,
            locked: layer.locked,
            inPoint: layer.inPoint,
            outPoint: layer.outPoint
        };

        result.layers.push(layerInfo);
    }

    return JSON.stringify(result, null, 2);
}

function bridgeHealth(args) {
    try {
        var resultFile = new File(getResultFilePath());
        var commandFile = new File(getCommandFilePath());
        return successEnvelope("bridgeHealth", {
            commandFilePath: getCommandFilePath(),
            resultFilePath: getResultFilePath(),
            commandFileExists: commandFile.exists,
            resultFileExists: resultFile.exists,
            autoRunEnabled: autoRunCheckbox.value,
            checkIntervalMs: checkInterval
        });
    } catch (error) {
        return errorEnvelope("bridgeHealth", "INTERNAL_ERROR", "Failed to read bridge health.", error.toString());
    }
}

function listProjectItems(args) {
    try {
        var includeFootageInfo = args.includeFootageInfo === true;
        var typeFilter = args.typeFilter ? String(args.typeFilter).toLowerCase() : null;
        var folderOnly = args.folderOnly === true;
        var items = [];
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            var itemType = "unknown";
            if (item instanceof CompItem) itemType = "comp";
            else if (item instanceof FolderItem) itemType = "folder";
            else if (item instanceof FootageItem) itemType = "footage";
            if (folderOnly && itemType !== "folder") continue;
            if (typeFilter && itemType !== typeFilter) continue;
            var entry = {
                itemId: item.id,
                itemIndex: i,
                itemName: item.name,
                itemType: itemType,
                parentFolderName: item.parentFolder ? item.parentFolder.name : null,
                parentFolderId: item.parentFolder ? item.parentFolder.id : null,
                comment: item.comment || ""
            };
            if (itemType === "comp") {
                entry.duration = item.duration;
                entry.frameRate = item.frameRate;
                entry.width = item.width;
                entry.height = item.height;
            }
            if (includeFootageInfo && itemType === "footage") {
                try {
                    entry.mainSource = {
                        file: item.file ? item.file.fsName : null,
                        hasVideo: item.hasVideo,
                        hasAudio: item.hasAudio,
                        duration: item.duration,
                        width: item.width,
                        height: item.height
                    };
                } catch (e1) {}
            }
            items.push(entry);
        }
        return successEnvelope("listProjectItems", {
            totalItems: app.project.numItems,
            items: items
        });
    } catch (error) {
        return errorEnvelope("listProjectItems", "INTERNAL_ERROR", "Failed to list project items.", error.toString());
    }
}

function resolveProjectItem(args) {
    if (args.itemId !== undefined && args.itemId !== null) {
        for (var i = 1; i <= app.project.numItems; i++) {
            var byId = app.project.item(i);
            if (byId && byId.id === parseInt(args.itemId, 10)) return byId;
        }
        throw new Error("Project item not found with id " + args.itemId);
    }
    if (args.itemIndex !== undefined && args.itemIndex !== null) {
        var idx = parseInt(args.itemIndex, 10);
        var byIndex = app.project.item(idx);
        if (!byIndex) throw new Error("Project item not found at index " + idx);
        return byIndex;
    }
    if (args.itemName) {
        for (var j = 1; j <= app.project.numItems; j++) {
            var byName = app.project.item(j);
            if (byName && byName.name === args.itemName) return byName;
        }
        throw new Error("Project item not found with name '" + args.itemName + "'");
    }
    throw new Error("One of itemId, itemIndex, or itemName is required.");
}

function getProjectItemInfo(args) {
    try {
        var item = resolveProjectItem(args);
        var itemType = "unknown";
        if (item instanceof CompItem) itemType = "comp";
        else if (item instanceof FolderItem) itemType = "folder";
        else if (item instanceof FootageItem) itemType = "footage";
        var data = {
            itemId: item.id,
            itemName: item.name,
            itemType: itemType,
            parentFolderName: item.parentFolder ? item.parentFolder.name : null,
            parentFolderId: item.parentFolder ? item.parentFolder.id : null,
            comment: item.comment || ""
        };
        if (itemType === "comp") {
            data.duration = item.duration;
            data.frameRate = item.frameRate;
            data.width = item.width;
            data.height = item.height;
            data.numLayers = item.numLayers;
            data.bgColor = item.bgColor;
        }
        if (itemType === "footage") {
            try {
                data.file = item.file ? item.file.fsName : null;
                data.hasVideo = item.hasVideo;
                data.hasAudio = item.hasAudio;
                data.duration = item.duration;
                data.width = item.width;
                data.height = item.height;
            } catch (e1) {}
        }
        return successEnvelope("getProjectItemInfo", data);
    } catch (error) {
        return errorEnvelope("getProjectItemInfo", "ITEM_NOT_FOUND", "Failed to resolve project item.", error.toString());
    }
}

function getCompositionSettings(args) {
    try {
        var comp = resolveComp(args);
        return successEnvelope("getCompositionSettings", {
            compId: comp.id,
            compName: comp.name,
            width: comp.width,
            height: comp.height,
            pixelAspect: comp.pixelAspect,
            duration: comp.duration,
            frameRate: comp.frameRate,
            bgColor: comp.bgColor,
            workAreaStart: comp.workAreaStart,
            workAreaDuration: comp.workAreaDuration,
            hideShyLayers: comp.hideShyLayers,
            motionBlur: comp.motionBlur,
            draft3d: comp.draft3d,
            frameBlending: comp.frameBlending,
            shutterAngle: comp.shutterAngle,
            shutterPhase: comp.shutterPhase,
            numLayers: comp.numLayers
        });
    } catch (error) {
        return errorEnvelope("getCompositionSettings", "COMP_NOT_FOUND", "Failed to read composition settings.", error.toString());
    }
}

function inspectPropertyTree(args) {
    try {
        var comp = resolveComp(args);
        var layer = resolveLayer(comp, args);
        var maxDepth = args.maxDepth !== undefined ? parseInt(args.maxDepth, 10) : 3;
        var includeValues = args.includeValues === true;
        var rootProperty = layer;
        var rootPath = [];
        if (normalizeSegments(args).length > 0) {
            var resolved = resolvePropertyTarget(layer, args);
            rootProperty = resolved.property;
            rootPath = resolved.canonicalPath.segments;
        }
        var tree = buildPropertyTreeNode(rootProperty, rootPath, 0, maxDepth, includeValues);
        return successEnvelope("inspectPropertyTree", {
            composition: { compId: comp.id, compName: comp.name },
            layer: { layerIndex: layer.index, layerName: layer.name },
            root: tree
        }, [], {
            nextHandles: {
                propertyPath: tree.path,
                propertyPathString: tree.pathString
            }
        });
    } catch (error) {
        return errorEnvelope("inspectPropertyTree", "PROP_NOT_FOUND", "Failed to inspect property tree.", error.toString());
    }
}

function getPropertyMetadata(args) {
    try {
        var comp = resolveComp(args);
        var layer = resolveLayer(comp, args);
        var resolved = resolvePropertyTarget(layer, args);
        return successEnvelope("getPropertyMetadata", {
            composition: { compId: comp.id, compName: comp.name },
            layer: { layerIndex: layer.index, layerName: layer.name },
            property: serializePropertyMetadata(resolved.property, resolved.canonicalPath)
        }, [], {
            nextHandles: {
                propertyPath: resolved.canonicalPath,
                propertyPathString: resolved.canonicalPathString
            }
        });
    } catch (error) {
        return errorEnvelope("getPropertyMetadata", "PROP_NOT_FOUND", "Failed to read property metadata.", error.toString());
    }
}

function getPropertyValue(args) {
    try {
        var comp = resolveComp(args);
        var layer = resolveLayer(comp, args);
        var resolved = resolvePropertyTarget(layer, args);
        var property = resolved.property;
        var useTime = args.time !== undefined && args.time !== null;
        var preExpression = args.preExpression === true;
        var value = useTime ? property.valueAtTime(parseFloat(args.time), preExpression) : property.value;
        return successEnvelope("getPropertyValue", {
            composition: { compId: comp.id, compName: comp.name },
            layer: { layerIndex: layer.index, layerName: layer.name },
            property: serializePropertyMetadata(property, resolved.canonicalPath),
            sampledAtTime: useTime ? parseFloat(args.time) : null,
            value: serializeValue(value)
        }, [], {
            nextHandles: {
                propertyPath: resolved.canonicalPath,
                propertyPathString: resolved.canonicalPathString
            }
        });
    } catch (error) {
        return errorEnvelope("getPropertyValue", "PROP_NOT_FOUND", "Failed to read property value.", error.toString());
    }
}

function buildPropertyValueForAssignment(property, value) {
    var valueType = inferPropertyValueTypeName(property);
    if (valueType === "shape" && value && value.vertices) {
        var shape = new Shape();
        shape.vertices = value.vertices;
        shape.inTangents = value.inTangents || [];
        shape.outTangents = value.outTangents || [];
        shape.closed = value.closed !== false;
        return shape;
    }
    if (valueType === "textDocument" && typeof value === "string") {
        var docFromString = property.value;
        docFromString.text = value;
        return docFromString;
    }
    if (valueType === "textDocument" && value && typeof value === "object") {
        var doc = property.value;
        if (value.text !== undefined) doc.text = value.text;
        if (value.font !== undefined) doc.font = value.font;
        if (value.fontSize !== undefined) doc.fontSize = value.fontSize;
        if (value.fillColor !== undefined) doc.fillColor = value.fillColor;
        if (value.strokeColor !== undefined) doc.strokeColor = value.strokeColor;
        if (value.strokeWidth !== undefined) doc.strokeWidth = value.strokeWidth;
        if (value.applyFill !== undefined) doc.applyFill = value.applyFill;
        if (value.applyStroke !== undefined) doc.applyStroke = value.applyStroke;
        if (value.tracking !== undefined) doc.tracking = value.tracking;
        if (value.leading !== undefined) doc.leading = value.leading;
        if (value.justification !== undefined) {
            if (String(value.justification) === "left") doc.justification = ParagraphJustification.LEFT_JUSTIFY;
            else if (String(value.justification) === "center") doc.justification = ParagraphJustification.CENTER_JUSTIFY;
            else if (String(value.justification) === "right") doc.justification = ParagraphJustification.RIGHT_JUSTIFY;
            else if (String(value.justification) === "full") doc.justification = ParagraphJustification.FULL_JUSTIFY_LASTLINE_LEFT;
        }
        return doc;
    }
    return value;
}

function setPropertyValue(args) {
    try {
        var comp = resolveComp(args);
        var layer = resolveLayer(comp, args);
        var resolved = resolvePropertyTarget(layer, args);
        var property = resolved.property;
        var assignedValue = buildPropertyValueForAssignment(property, args.value);
        var writeTime = null;

        if (args.time !== undefined && args.time !== null) {
            writeTime = parseFloat(args.time);
        } else if (property.numKeys && property.numKeys > 0) {
            writeTime = comp.time;
        }

        if (writeTime !== null) {
            property.setValueAtTime(writeTime, assignedValue);
        } else {
            property.setValue(assignedValue);
        }

        var readValue = writeTime !== null
            ? property.valueAtTime(writeTime, false)
            : property.value;

        return successEnvelope("setPropertyValue", {
            composition: { compId: comp.id, compName: comp.name },
            layer: { layerIndex: layer.index, layerName: layer.name },
            property: serializePropertyMetadata(property, resolved.canonicalPath),
            value: serializeValue(readValue),
            appliedAtTime: writeTime
        }, writeTime !== null ? [{
            code: "WRITE_USED_TIME",
            message: "Property write used setValueAtTime because the property is time-varying or a write time was provided.",
            details: { appliedAtTime: writeTime }
        }] : [], {
            nextHandles: {
                propertyPath: resolved.canonicalPath,
                propertyPathString: resolved.canonicalPathString
            }
        });
    } catch (error) {
        return errorEnvelope("setPropertyValue", "INVALID_VALUE", "Failed to set property value.", error.toString(), { attemptedValue: args.value });
    }
}

function getExpression(args) {
    try {
        var comp = resolveComp(args);
        var layer = resolveLayer(comp, args);
        var resolved = resolvePropertyTarget(layer, args);
        var property = resolved.property;
        return successEnvelope("getExpression", {
            composition: { compId: comp.id, compName: comp.name },
            layer: { layerIndex: layer.index, layerName: layer.name },
            property: serializePropertyMetadata(property, resolved.canonicalPath),
            expression: property.canSetExpression ? property.expression : null,
            expressionEnabled: property.canSetExpression ? property.expressionEnabled : false,
            expressionError: property.canSetExpression ? property.expressionError : null
        }, [], {
            nextHandles: {
                propertyPath: resolved.canonicalPath,
                propertyPathString: resolved.canonicalPathString
            }
        });
    } catch (error) {
        return errorEnvelope("getExpression", "PROP_NOT_FOUND", "Failed to read expression.", error.toString());
    }
}

// Execute command - with undo group wrapping and command ID passthrough
function executeCommand(command, args, commandId) {
    var result = "";

    logToPanel("Executing command: " + command + (commandId ? " (id: " + commandId + ")" : ""));
    statusText.text = "Running: " + command;
    panel.update();

    // Wrap everything in an undo group
    app.beginUndoGroup("MCP: " + command);

    try {
        // Use a switch statement for clarity
        switch (command) {
            // --- Read-only commands ---
            case "getProjectInfo":
                result = getProjectInfo();
                break;
            case "listCompositions":
                result = listCompositions();
                break;
            case "getLayerInfo":
                result = getLayerInfo();
                break;
            case "bridgeHealth":
                result = bridgeHealth(args);
                break;

            // --- Original creation commands ---
            case "createComposition":
                result = createComposition(args);
                break;
            case "createTextLayer":
                result = createTextLayer(args);
                break;
            case "createShapeLayer":
                result = createShapeLayer(args);
                break;
            case "createSolidLayer":
                result = createSolidLayer(args);
                break;
            case "setLayerProperties":
                result = setLayerProperties(args);
                break;
            case "setLayerKeyframe":
                result = setLayerKeyframe(args);
                break;
            case "setLayerExpression":
                result = setLayerExpression(args);
                break;
            case "applyEffect":
                result = applyEffect(args);
                break;
            case "applyEffectTemplate":
                result = applyEffectTemplate(args);
                break;
            case "bridgeTestEffects":
                result = bridgeTestEffects(args);
                break;

            // --- Priority 1: Layer Operations ---
            case "moveLayer":
                result = moveLayer(args);
                break;
            case "renameLayer":
                result = renameLayer(args);
                break;
            case "setLayerVisibility":
                result = setLayerVisibility(args);
                break;
            case "deleteLayer":
                result = deleteLayer(args);
                break;
            case "setBlendingMode":
                result = setBlendingMode(args);
                break;
            case "setLayerParent":
                result = setLayerParent(args);
                break;
            case "createNullObject":
                result = createNullObject(args);
                break;
            case "createAdjustmentLayer":
                result = createAdjustmentLayer(args);
                break;

            // --- Priority 2: Effect Control ---
            case "getLayerEffects":
                result = getLayerEffects(args);
                break;
            case "getEffectProperties":
                result = getEffectProperties(args);
                break;
            case "setEffectProperty":
                result = setEffectProperty(args);
                break;
            case "removeEffect":
                result = removeEffect(args);
                break;
            case "getLayerInfoEnhanced":
                result = getLayerInfoEnhanced(args);
                break;

            // --- Priority 3: Keyframes ---
            case "getKeyframes":
                result = getKeyframes(args);
                break;
            case "removeKeyframe":
                result = removeKeyframe(args);
                break;

            // --- Priority 4: Masks and Track Mattes ---
            case "addMask":
                result = addMask(args);
                break;
            case "setTrackMatte":
                result = setTrackMatte(args);
                break;

            // --- Priority 5: Asset Management ---
            case "importFile":
                result = importFile(args);
                break;
            case "addLayerFromItem":
                result = addLayerFromItem(args);
                break;
            case "precomposeLayers":
                result = precomposeLayers(args);
                break;
            case "duplicateLayer":
                result = duplicateLayer(args);
                break;
            case "getActiveComp":
                result = getActiveComp(args);
                break;
            case "saveProject":
                result = saveProject(args);
                break;
            case "openProject":
                result = openProject(args);
                break;

            // --- Priority 6: Rendering ---
            case "addToRenderQueue":
                result = addToRenderQueue(args);
                break;
            case "startRender":
                result = startRender(args);
                break;
            case "captureFrame":
                result = captureFrame(args);
                break;

            // --- Priority 7: QOL ---
            case "executeBatch":
                result = executeBatch(args);
                break;
            case "undo":
                result = undoOperation(args);
                break;
            case "redo":
                result = redoOperation(args);
                break;

            // --- Priority 8: Advanced Features ---
            case "setTextProperties":
                result = setTextProperties(args);
                break;
            case "getTextProperties":
                result = getTextProperties(args);
                break;
            case "modifyShapePath":
                result = modifyShapePath(args);
                break;
            case "setShapeColors":
                result = setShapeColors(args);
                break;
            case "addShapeGroup":
                result = addShapeGroup(args);
                break;
            case "createCamera":
                result = createCamera(args);
                break;
            case "createLight":
                result = createLight(args);
                break;
            case "addMarker":
                result = addMarker(args);
                break;
            case "getMarkers":
                result = getMarkers(args);
                break;
            case "removeMarker":
                result = removeMarker(args);
                break;
            case "setTimeRemapping":
                result = setTimeRemapping(args);
                break;
            case "setMotionBlur":
                result = setMotionBlur(args);
                break;
            case "setFrameBlending":
                result = setFrameBlending(args);
                break;
            case "searchTextLayers":
                result = searchTextLayers(args);
                break;
            case "inspectPropertyTree":
                result = inspectPropertyTree(args);
                break;
            case "listProjectItems":
                result = listProjectItems(args);
                break;
            case "getProjectItemInfo":
                result = getProjectItemInfo(args);
                break;
            case "getCompositionSettings":
                result = getCompositionSettings(args);
                break;
            case "getPropertyMetadata":
                result = getPropertyMetadata(args);
                break;
            case "getPropertyValue":
                result = getPropertyValue(args);
                break;
            case "setPropertyValue":
                result = setPropertyValue(args);
                break;
            case "getExpression":
                result = getExpression(args);
                break;

            default:
                result = JSON.stringify({ status: "error", message: "Unknown command: " + command });
        }

        app.endUndoGroup();

        // Save the result
        var resultString = (typeof result === 'string') ? result : JSON.stringify(result);

        // Auto-generate polyfill-like timestamp
        function getISOString() {
            var d = new Date();
            function pad(n) { return n < 10 ? '0' + n : n; }
            return d.getFullYear() + '-'
                + pad(d.getMonth() + 1) + '-'
                + pad(d.getDate()) + 'T'
                + pad(d.getHours()) + ':'
                + pad(d.getMinutes()) + ':'
                + pad(d.getSeconds()) + '.'
                + (d.getMilliseconds() / 1000).toFixed(3).slice(2, 5) + 'Z';
        }

        // Add metadata (timestamp, command name, command ID)
        try {
            var resultObj = JSON.parse(resultString);
            resultObj._responseTimestamp = getISOString();
            resultObj._commandExecuted = command;
            if (commandId) resultObj._commandId = commandId;
            resultString = JSON.stringify(resultObj, null, 2);
        } catch (parseError) {
            logToPanel("Could not parse result as JSON: " + parseError.toString());
        }

        var resultFile = new File(getResultFilePath());
        resultFile.encoding = "UTF-8";
        if (resultFile.open("w")) {
            resultFile.write(resultString);
            resultFile.close();
        } else {
            logToPanel("ERROR: Failed to open result file for writing.");
        }

        logToPanel("Command completed: " + command);
        statusText.text = "Completed: " + command;
        updateCommandStatus("completed");

    } catch (error) {
        // End undo group even on error
        try { app.endUndoGroup(); } catch (e) { }

        var errorMsg = "ERROR: " + command + ": " + error.toString() + (error.line ? " (line: " + error.line + ")" : "");
        logToPanel(errorMsg);
        statusText.text = "Error: " + error.toString();

        // Write error to result file
        try {
            function getISOStringError() {
                var d = new Date();
                function pad(n) { return n < 10 ? '0' + n : n; }
                return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + 'Z';
            }
            var errorResult = JSON.stringify({
                status: "error",
                command: command,
                _commandId: commandId || null,
                _commandExecuted: command,
                _responseTimestamp: getISOStringError(),
                message: error.toString(),
                line: error.line
            });
            var errorFile = new File(getResultFilePath());
            errorFile.encoding = "UTF-8";
            if (errorFile.open("w")) {
                errorFile.write(errorResult);
                errorFile.close();
            }
        } catch (writeError) {
            logToPanel("CRITICAL: Failed to write error: " + writeError.toString());
        }

        updateCommandStatus("error");
    }
}

// Update command file status
function updateCommandStatus(status) {
    try {
        var commandFile = new File(getCommandFilePath());
        if (commandFile.exists) {
            commandFile.open("r");
            var content = commandFile.read();
            commandFile.close();

            if (content) {
                var commandData = JSON.parse(content);
                commandData.status = status;

                commandFile.open("w");
                commandFile.write(JSON.stringify(commandData, null, 2));
                commandFile.close();
            }
        }
    } catch (e) {
        logToPanel("Error updating command status: " + e.toString());
    }
}

// Log message to panel
function logToPanel(message) {
    var timestamp = new Date().toLocaleTimeString();
    logText.text = timestamp + ": " + message + "\n" + logText.text;
}

// Check for new commands (with commandId passthrough)
function checkForCommands() {
    if (!autoRunCheckbox.value || isChecking) return;

    isChecking = true;

    try {
        var commandFile = new File(getCommandFilePath());
        if (commandFile.exists) {
            commandFile.open("r");
            var content = commandFile.read();
            commandFile.close();

            if (content) {
                var commandData = (typeof JSON !== "undefined" && JSON.parse)
                    ? JSON.parse(content)
                    : eval("(" + content + ")");

                // Only execute pending commands
                if (commandData.status === "pending") {
                    updateCommandStatus("running");
                    // Pass commandId for reliable result matching
                    executeCommand(commandData.command, commandData.args || {}, commandData.commandId || null);
                }
            }
        }
    } catch (e) {
        logToPanel("Error checking for commands: " + e.toString());
    }

    isChecking = false;
}

// Set up timer to check for commands
function startCommandChecker() {
    app.scheduleTask("checkForCommands()", checkInterval, true);
}

// Add manual check button
var checkButton = panel.add("button", undefined, "Check for Commands Now");
checkButton.onClick = function () {
    logToPanel("Manually checking for commands");
    checkForCommands();
};

// Log startup
logToPanel("MCP Bridge Auto started");
logToPanel("Command file: " + getCommandFilePath());
statusText.text = "Ready - Auto-run is " + (autoRunCheckbox.value ? "ON" : "OFF");

// Start the command checker
startCommandChecker();

// Show the panel
panel.center();
panel.show();
