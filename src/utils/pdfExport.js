import { jsPDF } from 'jspdf';
import { colorByKey, NODE_WIDTH, NODE_MIN_HEIGHT } from '../data/palette';

// Repli si un nœud n'a pas encore été mesuré : mêmes valeurs que le rendu.
const DEFAULT_W = NODE_WIDTH;
const DEFAULT_H = NODE_MIN_HEIGHT;
const MARGIN = 36; // pt
const CONNECTOR_COLOR = [207, 207, 207];
// Proportions natives du fichier logo (300 × 200 px), jamais déformées (charte §6).
const LOGO_RATIO = 200 / 300;
const LOGO_W = 72; // pt
const LOGO_H = LOGO_W * LOGO_RATIO;
const LOGO_TOP_MARGIN = MARGIN + LOGO_H + 14;

let logoDataUrlPromise = null;
function getLogoDataUrl() {
  if (!logoDataUrlPromise) {
    logoDataUrlPromise = fetch(`${import.meta.env.BASE_URL}logo-ceff.jpg`)
      .then((r) => {
        // Sans ce contrôle, une réponse 404 produirait un "blob" d'erreur
        // converti en data URL invalide, et le logo disparaîtrait en silence.
        if (!r.ok) throw new Error(`Logo introuvable (HTTP ${r.status})`);
        return r.blob();
      })
      .then(
        (blob) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          })
      )
      .catch((err) => {
        logoDataUrlPromise = null; // permet une nouvelle tentative au prochain export
        throw err;
      });
  }
  return logoDataUrlPromise;
}

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [242, 242, 242];
}

// Export vectoriel direct (pas de capture d'écran) : les boîtes et connecteurs
// sont redessinés à partir des données nodes/edges avec les primitives jsPDF,
// pour un rendu net une fois inséré dans un mémoire technique.
export async function exportOrgChartToPdf(nodes, edges, chartName, options = {}) {
  if (!nodes.length) return;
  const { includeLogo = false } = options;

  // Le logo est chargé AVANT la mise en page : sans cela, un échec de
  // chargement réserverait en haut de page un espace pour un logo absent,
  // et l'organigramme ne serait plus centré.
  let logoDataUrl = null;
  if (includeLogo) {
    try {
      logoDataUrl = await getLogoDataUrl();
    } catch (err) {
      window.alert(
        "Le logo CEFF n'a pas pu être chargé, le PDF est généré sans logo.\n\nDétail : " + err.message
      );
    }
  }
  const withLogo = !!logoDataUrl;

  const boxes = nodes.map((n) => {
    const w = n.measured?.width || n.width || DEFAULT_W;
    const h = n.measured?.height || n.height || DEFAULT_H;
    return { id: n.id, x: n.position.x, y: n.position.y, w, h, data: n.data };
  });

  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.w));
  const maxY = Math.max(...boxes.map((b) => b.y + b.h));
  const contentW = maxX - minX;
  const contentH = maxY - minY;

  // Le portrait est privilégié : on ne bascule en paysage que s'il agrandit
  // nettement l'organigramme (au moins 25 % de plus), sinon le portrait est
  // conservé même quand le paysage serait un peu plus grand.
  const A4_SHORT = 595.28;
  const A4_LONG = 841.89;
  const topMarginFor = () => (withLogo ? LOGO_TOP_MARGIN : MARGIN);
  const scaleFor = (pw, ph) =>
    Math.min((pw - MARGIN * 2) / contentW, (ph - topMarginFor() - MARGIN) / contentH, 1.5);

  const portraitScale = scaleFor(A4_SHORT, A4_LONG);
  const landscapeScale = scaleFor(A4_LONG, A4_SHORT);
  const orientation = landscapeScale > portraitScale * 1.25 ? 'landscape' : 'portrait';

  const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const topMargin = topMarginFor();
  const availW = pageW - MARGIN * 2;
  const availH = pageH - topMargin - MARGIN;

  const scale = Math.min(availW / contentW, availH / contentH, 1.5);
  const offsetX = MARGIN + (availW - contentW * scale) / 2;
  const offsetY = topMargin + (availH - contentH * scale) / 2;

  const tx = (x) => offsetX + (x - minX) * scale;
  const ty = (y) => offsetY + (y - minY) * scale;

  const byId = Object.fromEntries(boxes.map((b) => [b.id, b]));

  // Connecteurs d'abord (sous les boîtes), orthogonaux, sans flèche.
  doc.setLineWidth(0.75);
  doc.setDrawColor(...CONNECTOR_COLOR);
  edges.forEach((edge) => {
    const source = byId[edge.source];
    const target = byId[edge.target];
    if (!source || !target) return;
    const sx = tx(source.x + source.w / 2);
    const sy = ty(source.y + source.h);
    const txp = tx(target.x + target.w / 2);
    const tyEnd = ty(target.y);
    const midY = (sy + tyEnd) / 2;
    if (edge.data?.dashed) doc.setLineDashPattern([3, 2], 0);
    else doc.setLineDashPattern([], 0);
    doc.lines(
      [
        [0, midY - sy],
        [txp - sx, 0],
        [0, tyEnd - midY],
      ],
      sx,
      sy,
      [1, 1],
      'S'
    );
  });
  doc.setLineDashPattern([], 0);

  // Boîtes
  boxes.forEach((box) => {
    const x = tx(box.x);
    const y = ty(box.y);
    const w = box.w * scale;
    const h = box.h * scale;
    const color = colorByKey(box.data.color);
    const [r, g, b] = hexToRgb(color.bg);
    const radius = 8 * scale;

    doc.setFillColor(r, g, b);
    if (box.data.highlighted) {
      const [ar, ag, ab] = hexToRgb('#9B2020');
      doc.setDrawColor(ar, ag, ab);
      doc.setLineWidth(1);
    } else {
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.5);
    }
    doc.roundedRect(x, y, w, h, radius, radius, 'FD');

    const textColor = hexToRgb(color.text);
    const centerX = x + w / 2;
    let cursorY = y + 16 * scale;

    doc.setTextColor(...textColor);

    if (box.data.personName) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11 * Math.min(scale, 1));
      const nameLines = doc.splitTextToSize(box.data.personName, w - 16);
      nameLines.forEach((line) => {
        doc.text(line, centerX, cursorY, { align: 'center' });
        cursorY += 12 * scale;
      });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5 * Math.min(scale, 1));
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11 * Math.min(scale, 1));
    }
    const labelLines = doc.splitTextToSize(box.data.label || 'Fonction', w - 16);
    labelLines.forEach((line) => {
      doc.text(line, centerX, cursorY, { align: 'center' });
      cursorY += box.data.personName ? 11 * scale : 12 * scale;
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9 * Math.min(scale, 1));
    const secondary = box.data.color === 'primaire' || box.data.color === 'accent' ? textColor : hexToRgb('#404040');
    doc.setTextColor(...secondary);
    if (box.data.sublabel) {
      const subLines = doc.splitTextToSize(box.data.sublabel, w - 16);
      subLines.forEach((line) => {
        doc.text(line, centerX, cursorY, { align: 'center' });
        cursorY += 11 * scale;
      });
    }
    (box.data.extraLines || []).filter(Boolean).forEach((line) => {
      doc.text(line, centerX, cursorY, { align: 'center' });
      cursorY += 10.5 * scale;
    });

    if (box.data.badge) {
      const badgeText = box.data.badge;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      const badgeW = doc.getTextWidth(badgeText) + 12;
      const badgeH = 12;
      const bx = centerX - badgeW / 2;
      const by = y - badgeH / 2;
      doc.setFillColor(242, 242, 242);
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(1);
      doc.roundedRect(bx, by, badgeW, badgeH, badgeH / 2, badgeH / 2, 'FD');
      doc.setTextColor(64, 64, 64);
      doc.text(badgeText, centerX, by + badgeH / 2 + 2.5, { align: 'center' });
    }
  });

  if (withLogo) {
    doc.addImage(logoDataUrl, 'JPEG', MARGIN, MARGIN, LOGO_W, LOGO_H);
  }

  const safeName = (chartName || 'organigramme').trim() || 'organigramme';
  doc.save(`${safeName}.pdf`);
}
