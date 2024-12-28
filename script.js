// script.js

;(function(){
  const csvPath = 'data/family_test.csv';

  d3.csv(csvPath).then(data => {

    data = data.filter(d => d.ID); // Remove elements with empty ID field
  
    // 1) Gather all valid IDs
    const validIds = new Set(data.map(d => d.ID));

    // 2) Clean + check references
    data.forEach(d => {
      if (!d.Father)    d.Father    = null;
      if (!d.Mother)    d.Mother    = null;
      if (!d.MarriedTo) d.MarriedTo = null;

      if (d.Father && !validIds.has(d.Father)) {
        console.warn(`Warning: Person ${d.ID} references Father '${d.Father}' which doesn't exist. Ignoring.`);
        d.Father = null;
      }
      if (d.Mother && !validIds.has(d.Mother)) {
        console.warn(`Warning: Person ${d.ID} references Mother '${d.Mother}' which doesn't exist. Ignoring.`);
        d.Mother = null;
      }
      if (d.MarriedTo && !validIds.has(d.MarriedTo)) {
        console.warn(`Warning: Person ${d.ID} references MarriedTo '${d.MarriedTo}' which doesn't exist. Ignoring.`);
        d.MarriedTo = null;
      }
    });

    // 3) Build the graph
    const { nodes, edges, subgraphs } = buildMarriageGraph(data);

    // 4) Initialize dagre-d3 graph
    const g = new dagreD3.graphlib.Graph({ compound:true })
      .setGraph({
        rankdir: 'TB',
        edgesep: 30,
        ranksep: 50,
        nodesep: 20
      })
      .setDefaultEdgeLabel(() => ({}));

    // 5) Add nodes
    nodes.forEach(n => {
      g.setNode(n.id, {
        label: n.label,
        class: n.class || ''
      });
    });

    // 6) Add edges
    edges.forEach(e => {
      g.setEdge(e.source, e.target, {
        minlen: e.minlen || 1,
        arrowhead: 'undirected'
      });
    });

    // 7) Build subgraphs
    subgraphs.forEach(({ clusterId, nodeIds }) => {
      g.setNode(clusterId, {
        label: '',
        style: 'fill:none; stroke:none;',
        class: 'couple-cluster'
      });
      nodeIds.forEach(childId => {
        g.setParent(childId, clusterId);
      });
    });

    // 8) Render with dagre-d3
    const svg = d3.select('#svg-dagre');
    const inner = svg.select('g');
    const render = new dagreD3.render();
    render(inner, g);

    // 9) Shift small marriage rect if desired
    inner.selectAll('.node.marriage-minimal rect')
      .attr('transform', () => 'translate(5, 5)');

    // 10) (Removed the code that manually centers using translate)
    // We'll rely on zoom to let the user navigate.

    // 11) D3 Zoom & Pan
    const zoom = d3.zoom()
      .scaleExtent([0.1, 5])           // min and max zoom
      .on('zoom', (event) => {
        // Apply the transform to the <g> that holds everything
        inner.attr('transform', event.transform);
      });

    // Attach the zoom behavior to the SVG
    svg.call(zoom);

    // Optionally set an initial offset/scale
    svg.call(
      zoom.transform,
      d3.zoomIdentity.translate(100, 100).scale(0.8)
    );

    // 12) Tooltip
    const tooltip = d3.select('#tooltip');
    inner.selectAll('.node')
      .on('mouseover', function(event, nodeId) {
        const nodeObj = nodes.find(n => n.id === nodeId);
        if (!nodeObj) return;
        if (nodeObj.class.includes('person')) {
          const p = nodeObj.data;
          tooltip
            .style('display','block')
            .html(`
              <b>${p.Name}</b><br>
              Birth: ${p.Birth || 'N/A'}<br>
              Death: ${p.Death || 'N/A'}<br>
              Gender: ${p.Gender || 'N/A'}<br>
              <hr>
              ${p.Metadata || ''}
            `);
        }
      })
      .on('mousemove', event => {
        tooltip
          .style('left', (event.pageX+10) + 'px')
          .style('top',  (event.pageY+10) + 'px');
      })
      .on('mouseout', () => tooltip.style('display', 'none'));

  })
  .catch(err => console.error('Error loading CSV:', err));

})();
