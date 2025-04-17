import * as docx from "docx";
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  ImageRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  PageBreak,
  Packer,
} from "docx";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { ContentModule, Section } from "@shared/schema";

// Define interface for document data
interface DocExportData {
  document: {
    id: number;
    title: string;
    description: string | null;
    version: string;
  };
  sections: {
    section: Section;
    modules: ContentModule[];
    subSections: {
      section: Section;
      modules: ContentModule[];
    }[];
  }[];
  languageId?: number;
}

/**
 * Creates a Word document from the document data
 */
export async function createWordDocument(
  documentId: number,
  languageId?: number
): Promise<string> {
  try {
    // Retrieve document data
    const doc = await storage.getDocument(documentId);
    if (!doc) {
      throw new Error(`Document with ID ${documentId} not found`);
    }

    // Retrieve sections and organize them hierarchically
    const allSections = await storage.getSectionsByDocumentId(doc.id);
    const rootSections = allSections.filter((s) => !s.parentId);
    
    // Recupera la lingua selezionata se specificata
    let selectedLanguage = undefined;
    if (languageId) {
      selectedLanguage = await storage.getLanguage(languageId);
      if (!selectedLanguage) {
        console.warn(`Lingua con ID ${languageId} non trovata, verrà utilizzata la lingua originale`);
      }
    }
    
    // Sort sections by order
    rootSections.sort((a, b) => a.order - b.order);

    // Prepare export data structure
    const exportData: DocExportData = {
      document: {
        id: doc.id,
        title: doc.title,
        description: doc.description || "",
        version: doc.version,
      },
      sections: [],
      languageId: languageId,
    };

    // For each root section, get content and sub-sections
    for (const rootSection of rootSections) {
      const modules = await storage.getContentModulesBySectionId(rootSection.id);
      
      // Get sub-sections
      const subSections = allSections.filter(
        (s) => s.parentId === rootSection.id
      );
      subSections.sort((a, b) => a.order - b.order);

      const sectionData = {
        section: rootSection,
        modules: modules,
        subSections: [],
      };

      // For each sub-section, get content
      for (const subSection of subSections) {
        const subModules = await storage.getContentModulesBySectionId(subSection.id);
        sectionData.subSections.push({
          section: subSection,
          modules: subModules,
        });
      }

      exportData.sections.push(sectionData);
    }

    // Create Word document
    const wordDoc = new Document({
      title: doc.title,
      description: doc.description || "",
      styles: {
        paragraphStyles: [
          {
            id: "Normal",
            name: "Normal",
            run: {
              size: 24, // 12pt
              font: "Arial",
            },
            paragraph: {
              spacing: {
                after: 120, // 6pt
              },
            },
          },
          {
            id: "Heading1",
            name: "Heading 1",
            run: {
              size: 36, // 18pt
              bold: true,
              font: "Arial",
              color: "000000",
            },
            paragraph: {
              spacing: {
                before: 240, // 12pt
                after: 120, // 6pt
              },
            },
          },
          {
            id: "Heading2",
            name: "Heading 2",
            run: {
              size: 30, // 15pt
              bold: true,
              font: "Arial",
              color: "000000",
            },
            paragraph: {
              spacing: {
                before: 160, // 8pt
                after: 120, // 6pt
              },
            },
          },
          {
            id: "TableHeader",
            name: "Table Header",
            run: {
              size: 24, // 12pt
              bold: true,
              font: "Arial",
            },
            paragraph: {
              spacing: {
                before: 100, // 5pt
                after: 100, // 5pt
              },
            },
          },
        ],
      },
    });

    const sections = [];

    // Add document title
    sections.push({
      properties: {},
      children: [
        new Paragraph({
          text: doc.title,
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: {
            before: 400,
            after: 200,
          },
        }),
        new Paragraph({
          text: `Versione: ${doc.version}`,
          alignment: AlignmentType.CENTER,
          spacing: {
            after: 400,
          },
        }),
        new Paragraph({
          text: doc.description || "",
          alignment: AlignmentType.CENTER,
          spacing: {
            after: 800,
          },
        }),
        new Paragraph({
          text: "",
          pageBreakBefore: true,
        }),
      ],
    });

    // Process all sections and their content
    const docElements = [];

    for (const sectionData of exportData.sections) {
      // Add section heading
      docElements.push(
        new Paragraph({
          text: sectionData.section.title,
          heading: HeadingLevel.HEADING_1,
        })
      );

      if (sectionData.section.description) {
        docElements.push(
          new Paragraph({
            text: sectionData.section.description || "",
          })
        );
      }

      // Add modules from this section
      await addModulesToDocument(docElements, sectionData.modules, exportData.languageId);

      // Process subsections
      for (const subSection of sectionData.subSections) {
        // Add subsection heading
        docElements.push(
          new Paragraph({
            text: subSection.section.title,
            heading: HeadingLevel.HEADING_2,
          })
        );

        if (subSection.section.description) {
          docElements.push(
            new Paragraph({
              text: subSection.section.description || "",
            })
          );
        }

        // Add modules from this subsection
        await addModulesToDocument(docElements, subSection.modules, exportData.languageId);
      }
    }

    // Add all elements to the document
    sections.push({
      properties: {},
      children: docElements,
    });

    wordDoc.addSection({
      properties: {},
      children: [...sections[0].children, ...sections[1].children],
    });

    // Create the export directory if it doesn't exist
    const exportsDir = path.join(__dirname, "../exports");
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    // Create a clean filename from the document title
    const cleanTitle = doc.title
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();
    const filename = `${cleanTitle}_v${doc.version.replace(/\./g, "_")}.docx`;
    const outputPath = path.join(exportsDir, filename);

    // Write the document to file
    const buffer = await Packer.toBuffer(wordDoc);
    fs.writeFileSync(outputPath, buffer);

    return filename;
  } catch (error) {
    console.error("Error generating Word document:", error);
    throw error;
  }
}

/**
 * Add content modules to the Word document
 */
async function addModulesToDocument(
  docElements: any[],
  modules: ContentModule[],
  languageId?: number
): Promise<void> {
  // Sort modules by order
  modules.sort((a, b) => a.order - b.order);

  for (const module of modules) {
    try {
      // Cerca la traduzione del modulo se è specificato un ID lingua
      let translatedModule = module;
      let translationContent = null;
      
      if (languageId) {
        try {
          // Cerca una traduzione per questo modulo
          const translation = await storage.getContentModuleTranslationByLanguage(module.id, languageId);
          if (translation && translation.content) {
            translationContent = translation.content;
            // Creiamo una copia del modulo con il contenuto tradotto
            translatedModule = {
              ...module,
              translatedContent: translationContent
            };
            console.log(`Trovata traduzione per il modulo ${module.id}, tipo: ${module.type}`);
          }
        } catch (err) {
          console.warn(`Errore nel recupero della traduzione per il modulo ${module.id}:`, err);
        }
      }
      
      // Process the module based on its type
      switch (module.type) {
        case "text":
          addTextModule(docElements, translatedModule, translationContent);
          break;
        case "image":
          await addImageModule(docElements, translatedModule, translationContent);
          break;
        case "table":
          addTableModule(docElements, translatedModule, translationContent);
          break;
        case "warning":
          addWarningModule(docElements, translatedModule, translationContent);
          break;
        case "checklist":
          addChecklistModule(docElements, translatedModule, translationContent);
          break;
        case "component":
          await addComponentModule(docElements, translatedModule, translationContent);
          break;
        case "bom":
          await addBomModule(docElements, translatedModule, translationContent);
          break;
        case "3d-model":
          // Nota: i modelli 3D non possono essere inclusi direttamente in Word
          docElements.push(
            new Paragraph({
              text: `[Modello 3D - Questa visualizzazione è disponibile solo nel documento Web]`,
              style: "Normal",
            })
          );
          break;
        case "pdf":
          // Nota: i PDF non possono essere inclusi direttamente in Word
          docElements.push(
            new Paragraph({
              text: `[Documento PDF - Questa visualizzazione è disponibile solo nel documento Web]`,
              style: "Normal",
            })
          );
          break;
        case "video":
          // Nota: i video non possono essere inclusi direttamente in Word
          docElements.push(
            new Paragraph({
              text: `[Video - Questa visualizzazione è disponibile solo nel documento Web]`,
              style: "Normal",
            })
          );
          break;
        default:
          // Add a placeholder for unsupported module types
          docElements.push(
            new Paragraph({
              text: `[Contenuto di tipo "${module.type}" non supportato nell'esportazione Word]`,
              style: "Normal",
            })
          );
      }
    } catch (error) {
      console.error(`Error processing module of type ${module.type}:`, error);
      // Add a placeholder for the errored module
      docElements.push(
        new Paragraph({
          text: `[Errore nella conversione del contenuto di tipo "${module.type}"]`,
          style: "Normal",
        })
      );
    }
  }
}

/**
 * Add a text module to the document
 */
function addTextModule(docElements: any[], module: ContentModule, translationContent: any = null): void {
  // Usa il contenuto tradotto se disponibile
  const content = translationContent ? translationContent : module.content as { text: string };
  
  // Process text that might contain HTML
  // This is a simple approach - for more complex HTML we would need a proper HTML parser
  const text = content.text
    .replace(/<br>/g, "\n")
    .replace(/<(?:.|\n)*?>/g, ""); // Remove HTML tags

  // Split by line breaks and create paragraphs
  const paragraphs = text.split("\n");
  for (const para of paragraphs) {
    docElements.push(
      new Paragraph({
        text: para,
        style: "Normal",
      })
    );
  }
}

/**
 * Add an image module to the document
 */
async function addImageModule(
  docElements: any[],
  module: ContentModule,
  translationContent: any = null
): Promise<void> {
  // Usa il contenuto tradotto se disponibile
  const content = translationContent ? translationContent : module.content as { src: string; alt: string; caption?: string };
  
  // Check if file exists and is accessible
  const imagePath = path.join(__dirname, "../uploads", path.basename(content.src));
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image file not found: ${imagePath}`);
  }

  // Read image as base64
  const imageData = fs.readFileSync(imagePath);
  
  // Add the image
  docElements.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new ImageRun({
          data: imageData,
          transformation: {
            width: 400, // Adjust width as needed, maintaining aspect ratio
            height: 300, // Adjust height as needed
          },
        }),
      ],
    })
  );

  // Add caption if present
  if (content.caption) {
    docElements.push(
      new Paragraph({
        text: content.caption,
        alignment: AlignmentType.CENTER,
        style: "Normal",
      })
    );
  }
}

/**
 * Add a table module to the document
 */
function addTableModule(docElements: any[], module: ContentModule, translationContent: any = null): void {
  // Usa il contenuto tradotto se disponibile
  const content = translationContent ? translationContent : module.content as {
    headers: string[];
    rows: string[][];
    caption?: string;
  };

  // Create table
  const table = new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    },
  });

  // Add header row
  const headerRow = new TableRow({
    children: content.headers.map(
      (header) =>
        new TableCell({
          children: [
            new Paragraph({
              text: header,
              style: "TableHeader",
            }),
          ],
          shading: {
            fill: "EEEEEE",
          },
        })
    ),
  });
  table.addRow(headerRow);

  // Add data rows
  for (const rowData of content.rows) {
    const row = new TableRow({
      children: rowData.map(
        (cell) =>
          new TableCell({
            children: [
              new Paragraph({
                text: cell,
                style: "Normal",
              }),
            ],
          })
      ),
    });
    table.addRow(row);
  }

  // Add table to document
  docElements.push(table);

  // Add caption if present
  if (content.caption) {
    docElements.push(
      new Paragraph({
        text: content.caption,
        alignment: AlignmentType.CENTER,
        style: "Normal",
      })
    );
  }
}

/**
 * Add a warning module to the document
 */
function addWarningModule(docElements: any[], module: ContentModule, translationContent: any = null): void {
  // Usa il contenuto tradotto se disponibile
  const content = translationContent ? translationContent : module.content as {
    title: string;
    message: string;
    level: "info" | "warning" | "error";
  };

  // Set color based on warning level
  let color = "0000FF"; // blue for info
  if (content.level === "warning") {
    color = "FF8C00"; // orange for warning
  } else if (content.level === "error") {
    color = "FF0000"; // red for error
  }

  // Add warning title
  docElements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: content.title,
          bold: true,
          color: color,
        }),
      ],
      spacing: {
        before: 200,
      },
    })
  );

  // Add warning message
  docElements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: content.message,
          color: color,
        }),
      ],
      spacing: {
        after: 200,
      },
    })
  );
}

/**
 * Add a checklist module to the document
 */
function addChecklistModule(docElements: any[], module: ContentModule, translationContent: any = null): void {
  // Usa il contenuto tradotto se disponibile
  const content = translationContent ? translationContent : module.content as {
    items: { text: string; checked: boolean }[];
  };

  for (const item of content.items) {
    // Use "☑" for checked items and "☐" for unchecked items
    const checkbox = item.checked ? "☑" : "☐";
    
    docElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${checkbox} ${item.text}`,
          }),
        ],
        style: "Normal",
      })
    );
  }
}

/**
 * Add a BOM module to the document
 */
async function addBomModule(
  docElements: any[],
  module: ContentModule,
  translationContent: any = null
): Promise<void> {
  // Estrai il contenuto del modulo BOM
  // I BOM non hanno traduzioni specifiche, quindi ignoriamo il parametro translationContent
  const content = module.content as {
    bomId: number;
    filter?: string;
    // Filtri per l'esportazione
    filterSettings?: {
      codeFilter?: string;
      codeFilterType?: 'contains' | 'startsWith' | 'equals';
      descriptionFilter?: string;
      descriptionFilterType?: 'contains' | 'startsWith' | 'equals';
      levelFilter?: number;
      enableFiltering: boolean;
    };
  };

  if (!content.bomId) {
    docElements.push(
      new Paragraph({
        text: "[Nessuna distinta base selezionata]",
        style: "Normal",
      })
    );
    return;
  }

  // Recupera la distinta base
  const bom = await storage.getBom(content.bomId);
  if (!bom) {
    throw new Error(`Distinta base con ID ${content.bomId} non trovata`);
  }

  // Recupera gli elementi della distinta
  const bomItems = await storage.getBomItemsByBomId(content.bomId);
  if (!bomItems || bomItems.length === 0) {
    docElements.push(
      new Paragraph({
        text: `[Distinta base ${bom.title} - Nessun componente trovato]`,
        style: "Normal",
      })
    );
    return;
  }

  // Applica i filtri se presenti nelle impostazioni
  let filteredItems = [...bomItems];
  
  if (content.filterSettings && content.filterSettings.enableFiltering) {
    const { 
      codeFilter, codeFilterType, 
      descriptionFilter, descriptionFilterType, 
      levelFilter 
    } = content.filterSettings;

    // Cerca codici padre e figli se è specificato un filtro per codice
    let childCodes: string[] = [];
    if (codeFilter) {
      // Funzione per trovare i codici figli di un codice selezionato
      const findChildComponents = (items: any[], parentCode: string): string[] => {
        const childCodes: string[] = [];
        let currentLevel = -1;
        let isChildren = false;
        
        // Prima identifica il livello del codice padre
        for (const item of items) {
          if (item.component && item.component.code === parentCode) {
            currentLevel = item.level;
            isChildren = true;
            childCodes.push(parentCode); // Includi anche il codice padre
            break;
          }
        }
        
        // Se il codice padre è stato trovato, cerca tutti i figli
        if (isChildren) {
          for (const item of items) {
            if (item.level > currentLevel) {
              // Questo è un figlio del codice padre
              if (item.component && item.component.code) {
                childCodes.push(item.component.code);
              }
            } else if (item.level <= currentLevel && childCodes.length > 1) {
              // Abbiamo trovato un elemento successivo di livello uguale o superiore
              // dopo aver già aggiunto dei figli, quindi siamo fuori dal ramo
              break;
            }
          }
        }
        
        return childCodes;
      };

      // Trova prima il componente che corrisponde esattamente al filtro
      const parentItem = bomItems.find((item: any) => 
        item.component && 
        item.component.code.toLowerCase() === codeFilter.toLowerCase()
      );
      
      if (parentItem) {
        // Trova tutti i componenti figli
        childCodes = findChildComponents(bomItems, parentItem.component.code);
      }
    }

    // Filtra gli elementi
    filteredItems = bomItems.filter((item: any) => {
      if (!item || !item.component) return false;
      
      const code = item.component.code || '';
      const description = item.component.description || '';
      
      // Gestione speciale per filtro codice se abbiamo trovato una gerarchia
      let codeMatch = true;  // Predefinito a true se non c'è filtro
      if (codeFilter) {
        if (childCodes.length > 0) {
          // Usa la logica gerarchica se abbiamo trovato il codice specificato
          codeMatch = childCodes.includes(code);
        } else {
          // Altrimenti usa il filtro normale
          switch (codeFilterType) {
            case 'equals':
              codeMatch = code.toLowerCase() === codeFilter.toLowerCase();
              break;
            case 'startsWith':
              codeMatch = code.toLowerCase().startsWith(codeFilter.toLowerCase());
              break;
            case 'contains':
            default:
              codeMatch = code.toLowerCase().includes(codeFilter.toLowerCase());
              break;
          }
        }
      }
      
      // Applica il filtro per descrizione
      let descriptionMatch = true;
      if (descriptionFilter) {
        switch (descriptionFilterType) {
          case 'equals':
            descriptionMatch = description.toLowerCase() === descriptionFilter.toLowerCase();
            break;
          case 'startsWith':
            descriptionMatch = description.toLowerCase().startsWith(descriptionFilter.toLowerCase());
            break;
          case 'contains':
          default:
            descriptionMatch = description.toLowerCase().includes(descriptionFilter.toLowerCase());
            break;
        }
      }
      
      // Applica il filtro per livello
      let levelMatch = true;
      if (levelFilter !== undefined && levelFilter !== null) {
        levelMatch = item.level === levelFilter;
      }
      
      // Tutte le condizioni devono essere soddisfatte
      return codeMatch && descriptionMatch && levelMatch;
    });
  }

  // Titolo della distinta
  docElements.push(
    new Paragraph({
      text: bom.title || "Distinta Base",
      style: "Heading2",
    })
  );

  // Aggiungi una tabella con gli elementi della distinta
  const table = new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    },
  });

  // Aggiungi riga di intestazione
  const headerRow = new TableRow({
    children: [
      new TableCell({
        children: [
          new Paragraph({
            text: "N°",
            style: "TableHeader",
          }),
        ],
        shading: {
          fill: "EEEEEE",
        },
      }),
      new TableCell({
        children: [
          new Paragraph({
            text: "Livello",
            style: "TableHeader",
          }),
        ],
        shading: {
          fill: "EEEEEE",
        },
      }),
      new TableCell({
        children: [
          new Paragraph({
            text: "Codice",
            style: "TableHeader",
          }),
        ],
        shading: {
          fill: "EEEEEE",
        },
      }),
      new TableCell({
        children: [
          new Paragraph({
            text: "Descrizione",
            style: "TableHeader",
          }),
        ],
        shading: {
          fill: "EEEEEE",
        },
      }),
      new TableCell({
        children: [
          new Paragraph({
            text: "Quantità",
            style: "TableHeader",
          }),
        ],
        shading: {
          fill: "EEEEEE",
        },
      }),
    ],
  });
  table.addRow(headerRow);

  // Aggiungi righe per ogni elemento della distinta
  filteredItems.forEach((item: any, index: number) => {
    // Verifica che item esista e sia valido
    if (!item || !item.component) return;

    // Estrai proprietà in modo sicuro
    const level = item.level !== undefined ? item.level : '';
    const code = item.component.code || '';
    const description = item.component.description || '';
    const quantity = item.quantity || 0;

    const dataRow = new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              text: String(index + 1),
              style: "Normal",
            }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph({
              text: String(level),
              style: "Normal",
            }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph({
              text: code,
              style: "Normal",
            }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph({
              text: description,
              style: "Normal",
            }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph({
              text: String(quantity),
              style: "Normal",
            }),
          ],
        }),
      ],
    });
    table.addRow(dataRow);
  });

  // Aggiungi tabella al documento
  docElements.push(table);

  // Aggiungi una nota sui filtri se presenti
  if (content.filterSettings && content.filterSettings.enableFiltering) {
    const filterNote = `Nota: Sono stati applicati filtri alla visualizzazione della distinta base.`;
    docElements.push(
      new Paragraph({
        text: filterNote,
        style: "Normal",
        spacing: {
          before: 120,
        },
      })
    );
  }
}

/**
 * Add a component module to the document
 */
async function addComponentModule(
  docElements: any[],
  module: ContentModule,
  translationContent: any = null
): Promise<void> {
  // I componenti non hanno traduzioni specifiche, quindi ignoriamo il parametro translationContent
  const content = module.content as { componentId: number; quantity: number };
  
  // Fetch component details
  const component = await storage.getComponent(content.componentId);
  if (!component) {
    throw new Error(`Component with ID ${content.componentId} not found`);
  }

  // Create a table with component details
  const table = new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    },
  });

  // Add header row
  const headerRow = new TableRow({
    children: [
      new TableCell({
        children: [
          new Paragraph({
            text: "Codice",
            style: "TableHeader",
          }),
        ],
        shading: {
          fill: "EEEEEE",
        },
      }),
      new TableCell({
        children: [
          new Paragraph({
            text: "Descrizione",
            style: "TableHeader",
          }),
        ],
        shading: {
          fill: "EEEEEE",
        },
      }),
      new TableCell({
        children: [
          new Paragraph({
            text: "Quantità",
            style: "TableHeader",
          }),
        ],
        shading: {
          fill: "EEEEEE",
        },
      }),
    ],
  });
  table.addRow(headerRow);

  // Add component row
  const dataRow = new TableRow({
    children: [
      new TableCell({
        children: [
          new Paragraph({
            text: component.code,
            style: "Normal",
          }),
        ],
      }),
      new TableCell({
        children: [
          new Paragraph({
            text: component.description,
            style: "Normal",
          }),
        ],
      }),
      new TableCell({
        children: [
          new Paragraph({
            text: String(content.quantity),
            style: "Normal",
          }),
        ],
      }),
    ],
  });
  table.addRow(dataRow);

  // Add table to document
  docElements.push(table);
}