import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  Node,
  Edge,
  ConnectionLineType,
} from "@xyflow/react";

import { Container, SpaceBetween } from "@cloudscape-design/components";
import { Ingredient, Manifest } from "c2pa";

import dagre from "dagre";

const position = { x: 0, y: 0 };

interface IInteractiveMap {
  activeManifest: Manifest;
}

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));
const nodeWidth = 250;
const nodeHeight = 150;

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  dagreGraph.setGraph({ rankdir: "TB" });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newNode = {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };

    return newNode;
  });

  return { nodes: newNodes, edges };
};

const recursiveBoth = (
  parentID: string,
  ingredient: Ingredient
): [nodes: Node[], edges: Edge[]] => {
  const uuid = crypto.randomUUID();

  const initialNodes: Node[] = [
    {
      id: uuid,
      data: {
        label: (
          <SpaceBetween size="xxxs">
            <>{ingredient.title}</>
            <img width={100} src={ingredient.thumbnail?.getUrl().url} />
          </SpaceBetween>
        ),
      },
      position,
    },
  ];
  const initialEdges: Edge[] = [
    {
      id: `e${parentID}${uuid}`,
      source: parentID,
      target: uuid,
      type: "smoothstep",
      animated: true,
    },
  ];

  if (!ingredient.manifest) {
    return [initialNodes, initialEdges];
  } else {
    for (const child of ingredient.manifest.ingredients) {
      const [nodesToAdd, edgeToAdd] = recursiveBoth(uuid, child);
      initialNodes.push(...nodesToAdd);
      initialEdges.push(...edgeToAdd);
    }

    return [initialNodes, initialEdges];
  }
};

export const InteractiveMap = ({ activeManifest }: IInteractiveMap) => {
  const getGraph = (): [nodes: Node[], edges: Edge[]] => {
    const initialNodes: Node[] = [
      {
        id: activeManifest.instanceId,
        data: {
          label: (
            <SpaceBetween size="xxxs">
              {activeManifest.title}
              <img width={100} src={activeManifest.thumbnail?.getUrl().url} />
            </SpaceBetween>
          ),
        },
        type: "input",
        position,
      },
    ];
    const initialEdges: Edge[] = [];

    for (const ingredient of activeManifest.ingredients) {
      const [nodesToAdd, edgeToAdd] = recursiveBoth(
        activeManifest.instanceId,
        ingredient
      );
      initialNodes.push(...nodesToAdd);
      initialEdges.push(...edgeToAdd);
    }

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges
    );

    return [layoutedNodes, layoutedEdges];
  };

  const [layoutedNodes, layoutedEdges] = getGraph();

  const [nodes] = useNodesState(layoutedNodes);
  const [edges] = useEdgesState(layoutedEdges);

  return (
    <Container>
      <div style={{ height: "74vh" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          connectionLineType={ConnectionLineType.SmoothStep}
          fitView
        >
          <Background />
          <MiniMap />
          <Controls />
        </ReactFlow>
      </div>
    </Container>
  );
};
