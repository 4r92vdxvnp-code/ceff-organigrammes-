import { NODE_WIDTH, NODE_MIN_HEIGHT } from '../data/palette';

export function nodeSize(node) {
  return {
    w: node.measured?.width || node.width || NODE_WIDTH,
    h: node.measured?.height || node.height || NODE_MIN_HEIGHT,
  };
}

// Cherche l'accroche la plus proche sur un axe.
// `origin` est la coordonnée actuelle du bord début de la bulle, `size` sa
// dimension sur cet axe. Les trois points d'accroche testés sont le bord
// début, le centre et le bord fin.
//
// Renvoie une position ABSOLUE (`target`) et non un écart : appliquer un écart
// à un état intermédiaire différent de celui ayant servi au calcul décalerait
// la bulle.
export function bestMatch(origin, size, candidates, threshold) {
  let best = null;
  for (const c of candidates) {
    for (const offset of [0, size / 2, size]) {
      const target = c - offset;
      const diff = target - origin;
      if (Math.abs(diff) < threshold && (!best || Math.abs(diff) < Math.abs(best.diff))) {
        best = { diff, target, guideValue: c };
      }
    }
  }
  return best;
}

// Points d'accroche offerts par les autres bulles : bord début, centre et
// bord fin de chacune, plus le centre du canevas.
export function collectCandidates(nodes, draggedId, canvasCenter) {
  const candidatesX = [canvasCenter.x];
  const candidatesY = [canvasCenter.y];
  for (const n of nodes) {
    if (n.id === draggedId) continue;
    const { w, h } = nodeSize(n);
    candidatesX.push(n.position.x, n.position.x + w / 2, n.position.x + w);
    candidatesY.push(n.position.y, n.position.y + h / 2, n.position.y + h);
  }
  return { candidatesX, candidatesY };
}

// Calcule la position aimantée d'une bulle en cours de déplacement.
// Renvoie null si aucune accroche n'est assez proche.
export function computeSnap(draggedNode, nodes, canvasCenter, threshold) {
  const { w, h } = nodeSize(draggedNode);
  const { candidatesX, candidatesY } = collectCandidates(nodes, draggedNode.id, canvasCenter);

  const matchX = bestMatch(draggedNode.position.x, w, candidatesX, threshold);
  const matchY = bestMatch(draggedNode.position.y, h, candidatesY, threshold);
  if (!matchX && !matchY) return null;

  return {
    id: draggedNode.id,
    x: matchX ? matchX.target : draggedNode.position.x,
    y: matchY ? matchY.target : draggedNode.position.y,
    guideX: matchX ? matchX.guideValue : null,
    guideY: matchY ? matchY.guideValue : null,
  };
}
