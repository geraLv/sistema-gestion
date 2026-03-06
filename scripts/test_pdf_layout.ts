import PDFDocument from "pdfkit";
import fs from "fs";

function createTestPdf() {
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    doc.pipe(fs.createWriteStream("test_layout.pdf"));

    const mm = (val: number) => val * 2.83465;

    const drawField = (
        label: string,
        value: string,
        xMm: number,
        yMm: number,
        valXMm: number,
        widthMm: number,
        heightMm: number = 6,
    ) => {
        const yPt = mm(yMm);

        // Label
        doc
            .font("Times-Bold")
            .fontSize(12)
            .fillColor("#000000")
            .text(label, mm(xMm), yPt);

        // Box
        doc
            .rect(mm(valXMm), mm(yMm - 1), mm(widthMm), mm(heightMm))
            .stroke();

        // Dynamic Font Sizing
        let size = 12;
        doc.font("Times-Roman").fontSize(size);

        const maxWidth = mm(widthMm) - 2; // Subtract a bit for padding
        let textWidth = doc.widthOfString(value);

        while (textWidth > maxWidth && size > 6) {
            size -= 0.5;
            doc.fontSize(size);
            textWidth = doc.widthOfString(value);
        }

        // Calculate vertical offset to keep it centered
        const yOffset = (12 - size) / 2;

        // Value centered in box
        doc
            .text(value, mm(valXMm), yPt + 2 + yOffset, {
                width: mm(widthMm),
                height: mm(heightMm), // limit height
                align: "center",
                lineBreak: false,
            });
    };

    drawField("Dirección:", "BARRIO AGUA POTABLE ENTRE NEUQUEN Y NATIVIDAD YAIK", 20, 20, 41, 85);
    drawField("Localidad:", "Formosa-Matacos-Ingeniero Guillermo N. Juárez", 20, 30, 41, 55);
    drawField("Normal:", "Calle 123", 20, 40, 41, 55);

    doc.end();
}

createTestPdf();
