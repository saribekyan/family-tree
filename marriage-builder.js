// marriage-builder.js

function buildMarriageGraph(people) {
  const nodes = [];
  const edges = [];
  const coupleClusters = new Map();
  const personMap = new Map();

  // Store each person by string ID
  people.forEach(p => personMap.set(p.ID, p));

  // 1) Create node for each person
  people.forEach(p => {
    const pid = p.ID; // already a string
    if (p.Gender) {
      genderClass = (p.Gender === 'F') ? 'person-woman' : 'person-man';
    } else {
      genderClass = 'person-na';
    }
    nodes.push({
      id: pid,
      label: p.Name,
      class: `person ${genderClass}`,
      data: p
    });
  });

  // Helper to consistently order two string IDs
  function orderIDs(a, b) {
    // We'll do lexicographical order using localeCompare
    return (a.localeCompare(b) < 0) ? [a, b] : [b, a];
  }

  // 2) For each married pair, create a subgraph cluster
  //    plus a small "marriage-minimal" node
  function getOrCreateCoupleSubgraph(a, b) {
    // order them so "couple(A,B)" is always the same
    const [id1, id2] = orderIDs(a, b);
    const clusterId = `couple(${id1},${id2})`;
    if (!coupleClusters.has(clusterId)) {
      coupleClusters.set(clusterId, {
        id: clusterId,
        father: id1,
        mother: id2,
        marriageNodeId: `M(${id1},${id2})`
      });
    }
    return coupleClusters.get(clusterId);
  }

  // Identify all married couples
  people.forEach(p => {
    if (p.MarriedTo) {
      getOrCreateCoupleSubgraph(p.ID, p.MarriedTo);
    }
  });

  // For each subgraph, build the invisible marriage node + father->marriage + mother->marriage edges
  coupleClusters.forEach(c => {
    // The marriage node
    const marriageNode = {
      id: c.marriageNodeId,
      label: '',
      class: 'marriage-minimal'
    };
    nodes.push(marriageNode);

    // father->marriage, mother->marriage edges
    edges.push({ source: c.father, target: c.marriageNodeId, minlen: 1 });
    edges.push({ source: c.mother, target: c.marriageNodeId, minlen: 1 });
  });

  // 3) For each child, if father+mother are known, 
  //    see if father+mother form a recognized subgraph
  people.forEach(child => {
    const f = child.Father, m = child.Mother;
    if (f && m) {
      const [id1, id2] = orderIDs(f, m);
      const clusterId = `couple(${id1},${id2})`;
      const cluster = coupleClusters.get(clusterId);

      if (cluster) {
        // father & mother are a recognized married couple
        edges.push({
          source: cluster.marriageNodeId,
          target: child.ID, 
          minlen: 2
        });
      } else {
        // Not recognized as married => single-parent edges
        edges.push({ source: f, target: child.ID, minlen: 2 });
        // or edges.push({ source: m, target: child.ID, minlen: 2 });
      }
    } else if (f) {
      // single father
      edges.push({ source: f, target: child.ID, minlen: 2 });
    } else if (m) {
      // single mother
      edges.push({ source: m, target: child.ID, minlen: 2 });
    }
  });

  // 4) Subgraph definitions
  const subgraphs = [];
  coupleClusters.forEach(c => {
    subgraphs.push({
      clusterId: c.id,
      nodeIds: [ c.father, c.mother, c.marriageNodeId ]
    });
  });

  return { nodes, edges, subgraphs };
}

// Expose globally
window.buildMarriageGraph = buildMarriageGraph;
