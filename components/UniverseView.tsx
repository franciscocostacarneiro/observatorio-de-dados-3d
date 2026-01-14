
import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import ForceGraph3D, { ForceGraphMethods } from 'react-force-graph-3d';
import * as THREE from 'three';
import { Panel, GraphData, GraphNode } from '../types';
import { CLUSTER_COLORS } from '../constants';
import { Layers, Zap, RotateCw, Globe, Database, Network, Target, Share2 } from 'lucide-react';

interface UniverseViewProps {
  panels: Panel[];
  onNodeClick: (p: Panel) => void;
}

export const UniverseView: React.FC<UniverseViewProps> = ({ panels, onNodeClick }) => {
  const fgRef = useRef<ForceGraphMethods>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [showLegend, setShowLegend] = useState(true);
  const [isRotating, setIsRotating] = useState(true);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [translationEnabled, setTranslationEnabled] = useState(true); // Controlar translação
  const [nodeRotationEnabled, setNodeRotationEnabled] = useState(true); // Controlar rotação dos nós
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null); // Nó sendo arrastado
  
  // Refs para armazenar dados de órbita sem causar re-renders
  const orbitAnglesRef = useRef<Record<string, number>>({});
  const clusterOrbitAngleRef = useRef<number>(0);
  const frozenOrbitAngleRef = useRef<number>(0);
  const nodePositionsRef = useRef<Record<string, { x: number; y: number; z: number }>>({});
  const clusterLabelsRef = useRef<Record<string, THREE.Sprite>>({});
  const draggedNodesRef = useRef<Set<string>>(new Set());
  
  const clusterCentroids = useMemo(() => {
    const categories = Object.keys(CLUSTER_COLORS);
    const radius = 1300;
    const centroids: Record<string, { x: number, y: number, z: number }> = {};
    
    categories.forEach((cat, i) => {
      const phi = Math.acos(-1 + (2 * i) / categories.length);
      const theta = Math.sqrt(categories.length * Math.PI) * phi;
      centroids[cat] = {
        x: radius * Math.cos(theta) * Math.sin(phi),
        y: radius * Math.sin(theta) * Math.sin(phi),
        z: radius * Math.cos(phi)
      };
    });
    return centroids;
  }, []);

  const activeClusterCount = useMemo(() => {
    const groups = new Set(panels.map(p => p.group || 'Outros'));
    return groups.size;
  }, [panels]);

  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const nodes: GraphNode[] = panels.map((p) => {
      const cat = p.group || 'Educação';
      const center = clusterCentroids[cat] || { x: 0, y: 0, z: 0 };
      const spread = 600; // Aumentado de 400 para 600
      
      // Inicializar ângulo de órbita do nó
      if (!orbitAnglesRef.current[p.id]) {
        orbitAnglesRef.current[p.id] = Math.random() * Math.PI * 2;
      }
      
      // Calcular posição orbital inicial
      const angle = orbitAnglesRef.current[p.id];
      const orbitRadius = spread * 0.6; // Agora será 360 em vez de 240
      const offsetX = orbitRadius * Math.cos(angle);
      const offsetY = orbitRadius * 0.3 * Math.sin(angle * 0.7);
      const offsetZ = orbitRadius * Math.sin(angle);
      
      return {
        id: p.id,
        name: p.title,
        val: 24,
        thumbnail: p.thumbnail,
        description: p.description,
        tags: p.tags,
        group: cat,
        color: CLUSTER_COLORS[cat] || '#ffffff',
        fx: center.x + offsetX,
        fy: center.y + offsetY,
        fz: center.z + offsetZ
      };
    });

    const links: any[] = [];
    const grouped: Record<string, GraphNode[]> = {};
    nodes.forEach(n => {
      const g = n.group || 'Educação';
      if (!grouped[g]) grouped[g] = [];
      grouped[g].push(n);
    });

    Object.entries(grouped).forEach(([groupName, groupNodes]) => {
      if (groupNodes.length < 2) return;
      for (let i = 0; i < groupNodes.length; i++) {
        const source = groupNodes[i].id;
        const target1 = groupNodes[(i + 1) % groupNodes.length].id;
        links.push({ 
          source, 
          target: target1, 
          color: CLUSTER_COLORS[groupName],
          group: groupName 
        });
        if (groupNodes.length > 3) {
           const target2 = groupNodes[(i + 2) % groupNodes.length].id;
           links.push({ 
             source, 
             target: target2, 
             color: CLUSTER_COLORS[groupName],
             group: groupName 
           });
        }
      }
    });

    setGraphData({ nodes, links: [] }); // Sem links entre os nós
  }, [panels, clusterCentroids]);

  useEffect(() => {
    const applyRotation = () => {
      const controls = fgRef.current?.controls() as any;
      if (controls) {
        controls.autoRotate = isRotating;
        controls.autoRotateSpeed = 0.6;
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
      }
    };
    applyRotation();
    const timeout = setTimeout(applyRotation, 500);
    return () => clearTimeout(timeout);
  }, [isRotating, graphData]);

  // Animar órbitas dos nós e clusters de forma estável
  useEffect(() => {
    let frame: number;
    let updateCount = 0;
    const UPDATE_INTERVAL = 3; // Atualizar apenas a cada 3 frames para estabilidade
    
    const animateOrbits = () => {
      // Atualizar translação apenas se habilitada
      if (translationEnabled) {
        clusterOrbitAngleRef.current += 0.0008;
      }
      
      // Atualizar ângulos dos nós (apenas se rotação habilitada)
      if (nodeRotationEnabled) {
        Object.keys(orbitAnglesRef.current).forEach(nodeId => {
          orbitAnglesRef.current[nodeId] += 0.005 + Math.random() * 0.003;
        });
      }
      
      updateCount++;
      
      // Atualizar estado apenas a cada UPDATE_INTERVAL frames
      if (updateCount % UPDATE_INTERVAL === 0) {
        setGraphData(prev => {
          const updatedNodes = prev.nodes.map(node => {
            // Pular nós que foram arrastados manualmente
            if (draggedNodesRef.current.has(node.id)) {
              return node; // Manter posição atual
            }
            
            const cat = node.group || 'Educação';
            const originalCenter = clusterCentroids[cat] || { x: 0, y: 0, z: 0 };
            
            // Usar ângulo atual se translação habilitada, senão usar ângulo congelado
            const angleToUse = translationEnabled ? clusterOrbitAngleRef.current : frozenOrbitAngleRef.current;
            
            // Translação: órbita dos clusters em torno do centro
            const clusterCenterMoving = {
              x: originalCenter.x * Math.cos(angleToUse) - originalCenter.z * Math.sin(angleToUse),
              y: originalCenter.y,
              z: originalCenter.x * Math.sin(angleToUse) + originalCenter.z * Math.cos(angleToUse)
            };
            
            // Rotação: nós giram em torno de seu cluster
            // Raio menor quando cluster selecionado para aproximar nós
            const orbitRadius = translationEnabled ? 240 : 120;
            const angle = orbitAnglesRef.current[node.id] || 0;
            
            const offset = {
              x: orbitRadius * Math.cos(angle),
              y: (orbitRadius * 0.3) * Math.sin(angle * 0.7),
              z: orbitRadius * Math.sin(angle)
            };
            
            return {
              ...node,
              fx: clusterCenterMoving.x + offset.x,
              fy: clusterCenterMoving.y + offset.y,
              fz: clusterCenterMoving.z + offset.z
            };
          });
          
          return { ...prev, nodes: updatedNodes };
        });

        // Atualizar posições dos rótulos dos clusters (apenas se translação habilitada)
        if (translationEnabled) {
          Object.entries(clusterLabelsRef.current).forEach(([cat, label]) => {
            const originalCenter = clusterCentroids[cat] || { x: 0, y: 0, z: 0 };
            
            const movedPos = {
              x: originalCenter.x * Math.cos(clusterOrbitAngleRef.current) - originalCenter.z * Math.sin(clusterOrbitAngleRef.current),
              y: originalCenter.y,
              z: originalCenter.x * Math.sin(clusterOrbitAngleRef.current) + originalCenter.z * Math.cos(clusterOrbitAngleRef.current)
            };
            
            (label as THREE.Sprite).position.set(movedPos.x * 1.15, movedPos.y * 1.15, movedPos.z * 1.15);
          });
        }
      }
      
      frame = requestAnimationFrame(animateOrbits);
    };
    
    animateOrbits();
    return () => cancelAnimationFrame(frame);
  }, [clusterCentroids, translationEnabled, nodeRotationEnabled]);

  useEffect(() => {
    let frame: number;
    const animateCustomObjects = () => {
      if (fgRef.current) {
        const scene = fgRef.current.scene();
        
        const hub = scene.getObjectByName('shell-hub');
        if (hub) {
          // Rotação lenta do hub inteiro (muito sutil)
          hub.rotation.y += 0.0005;
          
          // Animar elementos do buraco negro
          hub.children.forEach((child) => {
            // Disco de acreção - anéis internos giram mais rápido
            if (child.name?.startsWith('accretion-ring-')) {
              const ringIndex = parseInt(child.name.split('-')[2]);
              child.rotation.z += 0.006 - ringIndex * 0.0004;
            }
            // Anéis de poeira distantes
            if (child.name?.startsWith('dust-ring-')) {
              const ringIndex = parseInt(child.name.split('-')[2]);
              child.rotation.z += 0.001 + ringIndex * 0.0002;
            }
            // Anel de fótons - pulsação sutil
            if (child.name === 'photon-ring') {
              const pulse = 1 + Math.sin(Date.now() * 0.003) * 0.05;
              child.scale.set(pulse, pulse, 1);
            }
            // Jatos relativísticos - ondulação
            if (child.name?.startsWith('jet-')) {
              const jetIndex = parseInt(child.name.split('-')[2]);
              const wave = Math.sin(Date.now() * 0.004 + jetIndex * 0.5) * 0.1;
              child.scale.x = 1 + wave;
              child.scale.z = 1 + wave;
            }
          });
        }
        
        // === ANIMAÇÃO DA GALÁXIA ESPIRAL ===
        const galaxy = scene.getObjectByName('spiral-galaxy');
        if (galaxy) {
          // Rotação lenta da galáxia (independente da câmera)
          galaxy.rotation.y += 0.0003;
          
          // Pulsação sutil do núcleo
          galaxy.children.forEach((child) => {
            if (child.name?.startsWith('galaxy-bulge-')) {
              const layerIndex = parseInt(child.name.split('-')[2]);
              const pulse = 1 + Math.sin(Date.now() * 0.001 + layerIndex * 0.3) * 0.03;
              child.scale.set(pulse, pulse, pulse);
            }
            if (child.name === 'galaxy-core-glow') {
              const pulse = 1 + Math.sin(Date.now() * 0.002) * 0.08;
              child.scale.set(pulse, pulse, pulse);
            }
          });
        }

        scene.children.forEach(child => {
          if (child.name?.startsWith('spatial-hud-')) {
            child.position.y += Math.sin(Date.now() * 0.0015) * 0.08;
          }
        });

        const scanner = scene.getObjectByName('scanner-ring');
        if (scanner) {
          scanner.rotation.z += 0.06;
          const scale = 1 + Math.sin(Date.now() * 0.012) * 0.15;
          scanner.scale.set(scale, scale, scale);
        }
      }
      frame = requestAnimationFrame(animateCustomObjects);
    };
    animateCustomObjects();
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (fgRef.current) {
      const fg = fgRef.current;
      const scene = fg.scene();

      scene.children = scene.children.filter(c => 
        !c.name?.startsWith('shell-') && 
        !c.name?.startsWith('spatial-hud-') && 
        !c.name?.startsWith('spiral-galaxy') &&
        !c.name?.startsWith('galaxy-')
      );

      const hubGroup = new THREE.Group();
      hubGroup.name = 'shell-hub';

      // Centro visual removido - a galáxia espiral será o elemento central
      
      scene.add(hubGroup);

      // === GALÁXIA ESPIRAL COM CENTRO NÍTIDO ===
      const galaxyGroup = new THREE.Group();
      galaxyGroup.name = 'spiral-galaxy';
      
      // Parâmetros para espiral bem definida
      const PARTICLE_COUNT = 55000;
      const GALAXY_RADIUS = 4500;
      
      const galaxyGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(PARTICLE_COUNT * 3);
      const colors = new Float32Array(PARTICLE_COUNT * 3);
      
      // Cores: núcleo dourado brilhante -> amarelo -> branco nas pontas
      const coreColor = new THREE.Color(0xfff4dd); // Branco dourado
      const midColor = new THREE.Color(0xffeecc); // Amarelo claro
      const armColor = new THREE.Color(0xeeeedd); // Branco quente
      const tipColor = new THREE.Color(0xccccdd); // Cinza azulado
      
      // Função gaussiana para espalhamento
      const gaussRand = () => {
        let u = 0, v = 0;
        while(u === 0) u = Math.random();
        while(v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      };
      
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        
        // Distribuição: 25% núcleo denso, 75% braços espirais
        const rand = Math.random();
        const isInCore = rand < 0.25;
        
        let x, y, z, distanceRatio;
        
        if (isInCore) {
          // NÚCLEO ESPIRAL - estrelas seguem espiral desde o centro
          const coreRadius = 600;
          const r = Math.pow(Math.random(), 0.4) * coreRadius;
          
          // Espiral continua até o centro!
          const armIndex = Math.floor(Math.random() * 2);
          const armOffset = armIndex * Math.PI;
          const spiralAngle = armOffset + Math.log(Math.max(r, 10) / 10) / 0.3;
          
          // Espalhamento muito fino no núcleo
          const spread = 15 + r * 0.05;
          x = Math.cos(spiralAngle) * r + gaussRand() * spread;
          z = Math.sin(spiralAngle) * r + gaussRand() * spread;
          y = gaussRand() * 25; // Muito fino
          
          distanceRatio = r / GALAXY_RADIUS;
        } else {
          // BRAÇOS ESPIRAIS EM "S" - continuação do núcleo
          const armIndex = Math.floor(Math.random() * 2);
          const armOffset = armIndex * Math.PI;
          
          // Distância a partir do núcleo
          const t = Math.pow(Math.random(), 0.6);
          const distance = 400 + t * (GALAXY_RADIUS - 400);
          distanceRatio = distance / GALAXY_RADIUS;
          
          // Espiral logarítmica contínua
          const spiralTightness = 0.32;
          const spiralAngle = armOffset + Math.log(distance / 10) / spiralTightness;
          
          // Espalhamento cresce com a distância
          const spreadWidth = 50 + distance * 0.06;
          const spreadX = gaussRand() * spreadWidth;
          const spreadZ = gaussRand() * spreadWidth;
          
          x = Math.cos(spiralAngle) * distance + spreadX;
          z = Math.sin(spiralAngle) * distance + spreadZ;
          
          // Altura fina
          const heightSpread = 30 * (1 - distanceRatio * 0.4);
          y = gaussRand() * heightSpread;
        }
        
        positions[i3] = x;
        positions[i3 + 1] = y;
        positions[i3 + 2] = z;
        
        // Gradiente de cor contínuo do centro às pontas
        const mixedColor = new THREE.Color();
        if (distanceRatio < 0.1) {
          // Centro brilhante
          mixedColor.copy(coreColor);
        } else if (distanceRatio < 0.25) {
          mixedColor.copy(coreColor).lerp(midColor, (distanceRatio - 0.1) / 0.15);
        } else if (distanceRatio < 0.5) {
          mixedColor.copy(midColor).lerp(armColor, (distanceRatio - 0.25) / 0.25);
        } else {
          mixedColor.copy(armColor).lerp(tipColor, (distanceRatio - 0.5) / 0.5);
        }
        
        // Brilho mais forte no centro
        const baseBrightness = isInCore ? 0.7 : 0.5;
        const brightness = baseBrightness + Math.random() * 0.3;
        colors[i3] = mixedColor.r * brightness;
        colors[i3 + 1] = mixedColor.g * brightness;
        colors[i3 + 2] = mixedColor.b * brightness;
      }
      
      galaxyGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      galaxyGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      
      // Material
      const galaxyMaterial = new THREE.PointsMaterial({
        size: 2.8,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.8,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      
      const galaxyParticles = new THREE.Points(galaxyGeometry, galaxyMaterial);
      galaxyParticles.name = 'galaxy-particles';
      galaxyGroup.add(galaxyParticles);
      
      // === NÚCLEO LUMINOSO (GLOW DOURADO) ===
      // Anel de luz ao redor do buraco negro
      for (let layer = 0; layer < 4; layer++) {
        const ringRadius = 350 + layer * 100;
        const ringGeo = new THREE.TorusGeometry(ringRadius, 80 - layer * 15, 16, 64);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xffeecc,
          transparent: true,
          opacity: 0.08 - layer * 0.015,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.name = `core-ring-${layer}`;
        galaxyGroup.add(ring);
      }
      
      // Posicionar a galáxia (sem glow central)
      galaxyGroup.rotation.x = Math.PI * 0.08; // Inclinação sutil
      galaxyGroup.position.y = -100;
      
      scene.add(galaxyGroup);

      // === GALÁXIAS DISTANTES (UNIVERSO PROFUNDO) - Realistas e difusas ===
      const createDistantGalaxy = (
        posX: number, posY: number, posZ: number, 
        scale: number, 
        rotX: number, rotY: number, rotZ: number,
        particleCount: number,
        color1: number, color2: number,
        galaxyType: 'spiral' | 'elliptical' | 'irregular' = 'spiral'
      ) => {
        const distantGalaxyGroup = new THREE.Group();
        
        const dgGeometry = new THREE.BufferGeometry();
        const dgPositions = new Float32Array(particleCount * 3);
        const dgColors = new Float32Array(particleCount * 3);
        
        const col1 = new THREE.Color(color1);
        const col2 = new THREE.Color(color2);
        
        // Função para ruído gaussiano suave
        const softGauss = () => {
          const u1 = Math.random();
          const u2 = Math.random();
          return Math.sqrt(-2 * Math.log(u1 + 0.001)) * Math.cos(2 * Math.PI * u2);
        };
        
        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          let x = 0, y = 0, z = 0;
          let brightness = 0.3;
          
          if (galaxyType === 'elliptical') {
            // Galáxia elíptica - distribuição suave sem braços
            const r = Math.pow(Math.random(), 0.5) * 100;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const flatten = 0.4 + Math.random() * 0.3;
            
            x = r * Math.sin(phi) * Math.cos(theta) + softGauss() * 15;
            y = r * Math.sin(phi) * Math.sin(theta) * flatten + softGauss() * 8;
            z = r * Math.cos(phi) + softGauss() * 15;
            
            brightness = 0.12 + Math.random() * 0.2 * (1 - r / 120);
            
          } else if (galaxyType === 'irregular') {
            // Galáxia irregular - manchas difusas
            const clumpX = (Math.random() - 0.5) * 80;
            const clumpZ = (Math.random() - 0.5) * 80;
            
            x = clumpX + softGauss() * 35;
            y = softGauss() * 12;
            z = clumpZ + softGauss() * 35;
            
            brightness = 0.08 + Math.random() * 0.15;
            
          } else {
            // Galáxia espiral - MUITO difusa e suave
            const isCore = Math.random() < 0.4;
            
            if (isCore) {
              // Núcleo difuso - nuvem suave
              const r = Math.pow(Math.random(), 0.7) * 45;
              const angle = Math.random() * Math.PI * 2;
              x = Math.cos(angle) * r + softGauss() * 18;
              y = softGauss() * 10;
              z = Math.sin(angle) * r + softGauss() * 18;
              
              brightness = 0.15 + Math.random() * 0.25 * (1 - r / 55);
            } else {
              // Braços espirais MUITO difusos
              const armIndex = Math.floor(Math.random() * 2);
              const armOffset = armIndex * Math.PI;
              const t = Math.pow(Math.random(), 0.5);
              const distance = 35 + t * 100;
              
              const spiralAngle = armOffset + Math.log(Math.max(distance, 25) / 22) / 0.55;
              
              // MUITO espalhamento
              const spread = 22 + distance * 0.3;
              const spreadX = softGauss() * spread;
              const spreadZ = softGauss() * spread;
              
              x = Math.cos(spiralAngle) * distance + spreadX;
              y = softGauss() * 8;
              z = Math.sin(spiralAngle) * distance + spreadZ;
              
              brightness = 0.06 + Math.random() * 0.14 * (1 - distance / 160);
            }
          }
          
          dgPositions[i3] = x;
          dgPositions[i3 + 1] = y;
          dgPositions[i3 + 2] = z;
          
          // Mistura de cores suave
          const distFromCenter = Math.sqrt(x*x + z*z);
          const ratio = Math.min(distFromCenter / 130, 1);
          const mixedColor = col1.clone().lerp(col2, ratio * 0.5);
          
          dgColors[i3] = mixedColor.r * brightness;
          dgColors[i3 + 1] = mixedColor.g * brightness;
          dgColors[i3 + 2] = mixedColor.b * brightness;
        }
        
        dgGeometry.setAttribute('position', new THREE.BufferAttribute(dgPositions, 3));
        dgGeometry.setAttribute('color', new THREE.BufferAttribute(dgColors, 3));
        
        const dgMaterial = new THREE.PointsMaterial({
          size: 1.2 * scale,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.3,
          vertexColors: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        
        const dgParticles = new THREE.Points(dgGeometry, dgMaterial);
        distantGalaxyGroup.add(dgParticles);
        
        // Halo/névoa sutil ao redor
        const hazeGeometry = new THREE.BufferGeometry();
        const hazeCount = Math.floor(particleCount * 0.25);
        const hazePositions = new Float32Array(hazeCount * 3);
        const hazeColors = new Float32Array(hazeCount * 3);
        
        for (let i = 0; i < hazeCount; i++) {
          const i3 = i * 3;
          const r = Math.pow(Math.random(), 0.4) * 150;
          const theta = Math.random() * Math.PI * 2;
          const flatten = 0.25 + Math.random() * 0.15;
          
          hazePositions[i3] = Math.cos(theta) * r + softGauss() * 25;
          hazePositions[i3 + 1] = softGauss() * 15 * flatten;
          hazePositions[i3 + 2] = Math.sin(theta) * r + softGauss() * 25;
          
          const hazeBrightness = 0.02 + Math.random() * 0.04;
          hazeColors[i3] = col1.r * hazeBrightness;
          hazeColors[i3 + 1] = col1.g * hazeBrightness;
          hazeColors[i3 + 2] = col1.b * hazeBrightness;
        }
        
        hazeGeometry.setAttribute('position', new THREE.BufferAttribute(hazePositions, 3));
        hazeGeometry.setAttribute('color', new THREE.BufferAttribute(hazeColors, 3));
        
        const hazeMaterial = new THREE.PointsMaterial({
          size: 3.5 * scale,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.12,
          vertexColors: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        
        const hazeParticles = new THREE.Points(hazeGeometry, hazeMaterial);
        distantGalaxyGroup.add(hazeParticles);
        
        distantGalaxyGroup.position.set(posX, posY, posZ);
        distantGalaxyGroup.rotation.set(rotX, rotY, rotZ);
        distantGalaxyGroup.scale.set(scale, scale, scale);
        distantGalaxyGroup.name = 'distant-galaxy';
        
        return distantGalaxyGroup;
      };
      
      // Criar galáxias distantes com variedade de tipos para maior realismo
      const distantGalaxies: Array<{
        pos: number[]; scale: number; rot: number[]; particles: number; 
        colors: number[]; type: 'spiral' | 'elliptical' | 'irregular';
      }> = [
        // Galáxias grandes (mais próximas no fundo) - mix de tipos
        { pos: [8000, 2000, -5000], scale: 8, rot: [0.3, 0.5, 0.2], particles: 1000, colors: [0xffeedd, 0xaabbff], type: 'spiral' },
        { pos: [-7000, -1500, -6000], scale: 7, rot: [0.8, 0.2, 0.4], particles: 900, colors: [0xffeecc, 0xddccaa], type: 'elliptical' },
        { pos: [5000, 3500, 7000], scale: 9, rot: [0.5, 1.2, 0.3], particles: 1100, colors: [0xfff0e0, 0xbbccff], type: 'spiral' },
        { pos: [-6000, 2500, 6500], scale: 6, rot: [0.2, 0.8, 0.6], particles: 800, colors: [0xffe8d0, 0xeeddbb], type: 'elliptical' },
        
        // Galáxias médias - mais elípticas e irregulares
        { pos: [9000, -3000, 4000], scale: 5, rot: [1.0, 0.3, 0.5], particles: 650, colors: [0xffddc0, 0x8899dd], type: 'spiral' },
        { pos: [-8500, 1000, -4500], scale: 5, rot: [0.4, 1.5, 0.2], particles: 600, colors: [0xffeedd, 0xddccbb], type: 'elliptical' },
        { pos: [4000, -4000, -8000], scale: 6, rot: [0.7, 0.4, 0.8], particles: 700, colors: [0xaaddff, 0x88aadd], type: 'irregular' },
        { pos: [-4500, 4500, 8000], scale: 5, rot: [0.9, 0.6, 0.3], particles: 550, colors: [0xffeecc, 0xeeddaa], type: 'elliptical' },
        { pos: [7500, 4000, 5500], scale: 4, rot: [0.3, 0.9, 0.7], particles: 500, colors: [0xffddb0, 0x7799cc], type: 'spiral' },
        { pos: [-9000, -2500, 3000], scale: 5, rot: [1.2, 0.2, 0.4], particles: 580, colors: [0xccddff, 0x99bbdd], type: 'irregular' },
        
        // Galáxias pequenas (muito distantes)
        { pos: [10000, 1000, -8000], scale: 3, rot: [0.5, 0.7, 0.9], particles: 400, colors: [0xffeedd, 0xddccbb], type: 'elliptical' },
        { pos: [-10500, 3000, -7000], scale: 3, rot: [0.8, 1.0, 0.2], particles: 380, colors: [0xffddc0, 0x6688aa], type: 'spiral' },
        { pos: [6000, -5000, 9000], scale: 3, rot: [0.2, 0.5, 1.1], particles: 420, colors: [0xbbddff, 0x7799bb], type: 'irregular' },
        { pos: [-5500, -4500, -9500], scale: 2.5, rot: [0.6, 0.3, 0.8], particles: 350, colors: [0xffeec0, 0xeeddcc], type: 'elliptical' },
        { pos: [11000, -2000, 6000], scale: 2.5, rot: [1.1, 0.8, 0.4], particles: 340, colors: [0xffe8b0, 0x6699cc], type: 'spiral' },
        { pos: [-11000, 500, 5000], scale: 2, rot: [0.4, 1.2, 0.6], particles: 280, colors: [0xffdda0, 0xddccaa], type: 'elliptical' },
        { pos: [3000, 6000, -10000], scale: 2.5, rot: [0.9, 0.4, 0.7], particles: 360, colors: [0xfff0d0, 0x7788bb], type: 'spiral' },
        { pos: [-3500, -6000, 10500], scale: 2, rot: [0.3, 0.9, 1.0], particles: 300, colors: [0xaaccff, 0x6677aa], type: 'irregular' },
        
        // Galáxias muito distantes (manchas difusas)
        { pos: [12000, 4000, -4000], scale: 1.5, rot: [0.7, 0.5, 0.3], particles: 220, colors: [0xffeedd, 0xeeddcc], type: 'elliptical' },
        { pos: [-12500, -1500, -6000], scale: 1.5, rot: [0.5, 0.8, 0.9], particles: 200, colors: [0xffddc0, 0x4466aa], type: 'spiral' },
        { pos: [8000, -6000, -7500], scale: 1.5, rot: [0.2, 1.1, 0.5], particles: 240, colors: [0xddddff, 0x5577bb], type: 'irregular' },
        { pos: [-7500, 5500, -8500], scale: 1.2, rot: [0.9, 0.3, 0.7], particles: 180, colors: [0xffeec0, 0xddccbb], type: 'elliptical' },
        { pos: [13000, 0, 3000], scale: 1.2, rot: [0.4, 0.6, 0.8], particles: 190, colors: [0xffe8b0, 0x5588aa], type: 'spiral' },
        { pos: [-13000, 2500, -2000], scale: 1, rot: [0.8, 0.2, 0.6], particles: 150, colors: [0xffdda0, 0xccbbaa], type: 'elliptical' },
      ];
      
      distantGalaxies.forEach(g => {
        const galaxy = createDistantGalaxy(
          g.pos[0], g.pos[1], g.pos[2],
          g.scale,
          g.rot[0], g.rot[1], g.rot[2],
          g.particles,
          g.colors[0], g.colors[1],
          g.type
        );
        scene.add(galaxy);
      });

      // === ESTRELAS DE FUNDO (POUCAS E SUTIS) ===
      const starGeo = new THREE.BufferGeometry();
      const starPos = [];
      const starColors = [];
      
      // Apenas uma camada de estrelas distantes e sutis
      for(let i=0; i<8000; i++) {
        const r = 7000 + Math.random() * 6000;
        const u = Math.random(); const v = Math.random();
        const theta = 2 * Math.PI * u; const phi = Math.acos(2 * v - 1);
        starPos.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
        
        // Cores muito sutis - azuladas
        const brightness = 0.3 + Math.random() * 0.4;
        starColors.push(brightness * 0.7, brightness * 0.75, brightness * 0.9);
      }
      
      starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
      starGeo.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
      const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ 
        size: 1.0, 
        transparent: true, 
        opacity: 0.4, 
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      }));
      stars.name = 'shell-stars';
      scene.add(stars);
      
      // === ESTRELAS DO UNIVERSO PROFUNDO ===
      const deepSpaceStarGeo = new THREE.BufferGeometry();
      const deepStarPos = [];
      const deepStarColors = [];
      
      // Estrelas muito distantes - preenchendo o universo profundo
      for(let i=0; i<25000; i++) {
        const r = 10000 + Math.random() * 10000; // De 10k a 20k de distância
        const u = Math.random(); const v = Math.random();
        const theta = 2 * Math.PI * u; const phi = Math.acos(2 * v - 1);
        
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);
        
        deepStarPos.push(x, y, z);
        
        // Cores variadas - brancas, azuladas e algumas amareladas
        const starType = Math.random();
        const brightness = 0.2 + Math.random() * 0.5;
        
        if (starType < 0.6) {
          // Brancas/azuladas (maioria)
          deepStarColors.push(brightness * 0.8, brightness * 0.85, brightness * 1.0);
        } else if (starType < 0.85) {
          // Brancas puras
          deepStarColors.push(brightness * 0.9, brightness * 0.9, brightness * 0.9);
        } else {
          // Amareladas/alaranjadas (poucas)
          deepStarColors.push(brightness * 1.0, brightness * 0.85, brightness * 0.6);
        }
      }
      
      deepSpaceStarGeo.setAttribute('position', new THREE.Float32BufferAttribute(deepStarPos, 3));
      deepSpaceStarGeo.setAttribute('color', new THREE.Float32BufferAttribute(deepStarColors, 3));
      
      const deepSpaceStars = new THREE.Points(deepSpaceStarGeo, new THREE.PointsMaterial({ 
        size: 0.8, 
        transparent: true, 
        opacity: 0.5, 
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      }));
      deepSpaceStars.name = 'deep-space-stars';
      scene.add(deepSpaceStars);
      
      // === ESTRELAS AINDA MAIS DISTANTES (FUNDO CÓSMICO) ===
      const cosmicBgGeo = new THREE.BufferGeometry();
      const cosmicPos = [];
      const cosmicColors = [];
      
      for(let i=0; i<15000; i++) {
        const r = 18000 + Math.random() * 12000; // De 18k a 30k
        const u = Math.random(); const v = Math.random();
        const theta = 2 * Math.PI * u; const phi = Math.acos(2 * v - 1);
        
        cosmicPos.push(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        );
        
        // Cores muito sutis e frias
        const brightness = 0.15 + Math.random() * 0.3;
        cosmicColors.push(brightness * 0.7, brightness * 0.75, brightness * 0.9);
      }
      
      cosmicBgGeo.setAttribute('position', new THREE.Float32BufferAttribute(cosmicPos, 3));
      cosmicBgGeo.setAttribute('color', new THREE.Float32BufferAttribute(cosmicColors, 3));
      
      const cosmicBgStars = new THREE.Points(cosmicBgGeo, new THREE.PointsMaterial({ 
        size: 0.5, 
        transparent: true, 
        opacity: 0.35, 
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      }));
      cosmicBgStars.name = 'cosmic-bg-stars';
      scene.add(cosmicBgStars);

      (Object.entries(clusterCentroids) as [string, {x: number, y: number, z: number}][]).forEach(([cat, pos]) => {
        const count = panels.filter(p => p.group === cat).length;
        
        // CORREÇÃO: Apenas adiciona os elementos visuais do cluster se houverem nós nele
        if (count > 0) {
          const label = createTextSprite(cat, CLUSTER_COLORS[cat], 44);
          label.position.set(pos.x * 1.15, pos.y * 1.15, pos.z * 1.15);
          label.name = `shell-label-${cat}`;
          clusterLabelsRef.current[cat] = label; // Armazenar referência do rótulo
          scene.add(label);
        }
      });

      fg.cameraPosition({ x: 3500, y: 1800, z: 3500 }, { x: 0, y: 0, z: 0 }, 3000);
    }
  }, [clusterCentroids, panels]);

  const createSpatialHUD = (text: string, color: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // IMPORTANTE: Limpar canvas com fundo totalmente transparente
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.font = '900 34px Orbitron';
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.6;
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      ctx.fillText(line, 256, 128 + (i * 45));
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(180, 220);
    ctx.lineTo(332, 220);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.premultiplyAlpha = true;
    const spriteMaterial = new THREE.SpriteMaterial({ 
      map: texture, 
      transparent: true, 
      blending: THREE.AdditiveBlending,
      opacity: 0.9,
      depthTest: false,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(180, 90, 1);
    return sprite;
  };

  const createTextSprite = (text: string, color: string, fontSize: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // IMPORTANTE: Limpar canvas com fundo totalmente transparente
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Texto formatado com colchetes estilo tech
    const formattedText = `[  ${text.toUpperCase()}  ]`;
    
    ctx.font = `900 ${fontSize}px Orbitron`;
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 25;
    ctx.fillText(formattedText, 512, 256);
    
    // Adicionar brilho extra
    ctx.shadowBlur = 40;
    ctx.globalAlpha = 0.5;
    ctx.fillText(formattedText, 512, 256);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.premultiplyAlpha = true;
    const spriteMaterial = new THREE.SpriteMaterial({ 
      map: texture, 
      transparent: true, 
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(fontSize * 18, fontSize * 9, 1);
    return sprite;
  };

  const nodeThreeObject = useCallback((node: any) => {
    const group = new THREE.Group();
    const isHovered = hoverNode?.id === node.id;
    const isRelated = hoverNode?.group === node.group;
    
    // === HITBOX INVISÍVEL PARA MELHOR SENSIBILIDADE ===
    // Esfera invisível maior para facilitar detecção do mouse
    const hitboxGeo = new THREE.SphereGeometry(node.val * 3.5, 16, 16);
    const hitboxMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false
    });
    const hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
    hitbox.name = 'hitbox';
    group.add(hitbox);
    
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(node.val, 28, 28),
      new THREE.MeshStandardMaterial({ 
        color: node.color, 
        emissive: node.color, 
        emissiveIntensity: isHovered ? 18.0 : (isRelated ? 7.2 : 3.6),
        metalness: 1.0,
        roughness: 0.0
      })
    );
    group.add(core);

    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    
    // IMPORTANTE: Limpar canvas com fundo totalmente transparente
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, node.color);
    grad.addColorStop(0.4, node.color.replace(')', ', 0.5)').replace('rgb', 'rgba'));
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,128,128);
    const glowTex = new THREE.CanvasTexture(canvas);
    glowTex.premultiplyAlpha = true;
    const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ 
      map: glowTex, 
      transparent: true, 
      blending: THREE.AdditiveBlending,
      opacity: isHovered ? 1.0 : (isRelated ? 0.7 : 0.4),
      depthTest: false,
      depthWrite: false
    }));
    glowSprite.scale.set(node.val * 6, node.val * 6, 1);
    group.add(glowSprite);

    if (isHovered) {
      const scannerGeo = new THREE.TorusGeometry(node.val * 2.8, 1.2, 4, 128);
      const scannerMat = new THREE.MeshBasicMaterial({ 
        color: '#ffffff', 
        transparent: true, 
        opacity: 0.9,
        blending: THREE.AdditiveBlending
      });
      const scanner = new THREE.Mesh(scannerGeo, scannerMat);
      scanner.name = 'scanner-ring';
      group.add(scanner);
    }

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(node.val * 2.0, 0.5, 8, 64),
      new THREE.MeshBasicMaterial({ color: node.color, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending })
    );
    ring.rotation.x = Math.PI / 2.2;
    group.add(ring);
    return group;
  }, [hoverNode]);

  const goToCluster = (cat: string) => {
    const originalCenter = clusterCentroids[cat];
    
    // Congelar o ângulo atual para manter posição quando desabilitar translação
    frozenOrbitAngleRef.current = clusterOrbitAngleRef.current;
    
    // Calcular posição atual do cluster (com translação aplicada)
    const c = {
      x: originalCenter.x * Math.cos(frozenOrbitAngleRef.current) - originalCenter.z * Math.sin(frozenOrbitAngleRef.current),
      y: originalCenter.y,
      z: originalCenter.x * Math.sin(frozenOrbitAngleRef.current) + originalCenter.z * Math.cos(frozenOrbitAngleRef.current)
    };
    
    setSelectedCluster(cat);
    setTranslationEnabled(false); // Desabilitar translação
    setNodeRotationEnabled(false); // Desabilitar rotação dos nós
    
    const distance = 750;
    const magnitude = Math.sqrt(c.x * c.x + c.y * c.y + c.z * c.z) || 1;
    const camX = c.x + (c.x / magnitude) * distance;
    const camY = c.y + (c.y / magnitude) * distance;
    const camZ = c.z + (c.z / magnitude) * distance;

    fgRef.current?.cameraPosition(
      { x: camX, y: camY, z: camZ }, 
      { x: c.x, y: c.y, z: c.z }, 
      2000
    );
    setIsRotating(false);
  };

  return (
    <div className="w-full h-full bg-black relative">
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="#000000"
        nodeThreeObject={nodeThreeObject}
        nodeLabel={null}
        nodeThreeObjectExtend={false}
        onNodeHover={setHoverNode}
        onNodeClick={(node: any) => {
          const p = panels.find(pa => pa.id === node.id);
          if (p) onNodeClick(p);
        }}
        linkColor={(link: any) => {
          const isHoveredSource = hoverNode?.id === link.source.id;
          const isHoveredTarget = hoverNode?.id === link.target.id;
          const isSameGroupAsHover = hoverNode?.group === link.group;
          const color = (isHoveredSource || isHoveredTarget || isSameGroupAsHover) ? '#ffffff' : link.color;
          const alpha = isSameGroupAsHover ? 0.8 : 0.15;
          if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
          }
          return color;
        }}
        linkOpacity={1}
        linkWidth={(link: any) => {
          const isSameGroupAsHover = hoverNode?.group === link.group;
          return isSameGroupAsHover ? 2.5 : 1.2;
        }}
        linkCurvature={0.25}
        linkDirectionalParticles={(link: any) => {
          const isSameGroupAsHover = hoverNode?.group === link.group;
          return isSameGroupAsHover ? 8 : 2;
        }}
        linkDirectionalParticleSpeed={0.01}
        linkDirectionalParticleWidth={(link: any) => {
          const isSameGroupAsHover = hoverNode?.group === link.group;
          return isSameGroupAsHover ? 3.0 : 1.2;
        }}
        warmupTicks={0}
        cooldownTicks={0}
        numDimensions={3}
        enableNodeDrag={true}
        onNodeDrag={(node: any) => {
          // Marcar nó como sendo arrastado
          draggedNodesRef.current.add(node.id);
          // Atualizar posição fixa durante arraste
          node.fx = node.x;
          node.fy = node.y;
          node.fz = node.z;
        }}
        onNodeDragEnd={(node: any) => {
          // Manter a posição após arrastar
          node.fx = node.x;
          node.fy = node.y;
          node.fz = node.z;
        }}
        enableNavigationControls={true}
        d3AlphaDecay={0.01}
        d3AlphaMin={0.0}
        d3VelocityDecay={0.99}
        showNavInfo={false}
      />

      <div className="absolute top-16 md:top-24 left-2 sm:left-4 md:left-10 z-20 pointer-events-none">
        <div className="flex flex-col gap-1 border-l-2 md:border-l-4 border-[#0670fa] pl-3 sm:pl-4 md:pl-8 py-3 sm:py-4 md:py-6 bg-gradient-to-r from-blue-950/20 to-transparent backdrop-blur-md rounded-r-xl sm:rounded-r-2xl md:rounded-r-[3rem]">
          <div className="flex flex-col gap-2 md:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 md:gap-5">
               <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-blue-500 animate-pulse shadow-[0_0_15px_rgba(59,130,246,1)]"></div>
               <h1 className="font-orbitron text-xs sm:text-sm md:text-xl lg:text-2xl font-black tracking-wide md:tracking-[0.4em] text-white uppercase">Constelação ONI</h1>
            </div>
            <p className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-blue-400 uppercase tracking-wider md:tracking-[0.3em] flex items-center gap-2 md:gap-4">
              <Globe className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden sm:inline">Matriz de dashboards</span><span className="sm:hidden">Dashboards</span>
            </p>
            <div className="hidden sm:flex items-center gap-4 md:gap-8 mt-2 md:mt-4 pt-2 md:pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 bg-blue-600/10 rounded-lg border border-blue-500/20">
                  <Network className="w-3 h-3 md:w-4 md:h-4 text-blue-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm md:text-[16px] font-black text-white leading-none">{activeClusterCount}</span>
                  <span className="text-[7px] md:text-[8px] font-bold text-gray-500 uppercase tracking-widest">Eixos</span>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 bg-blue-600/10 rounded-lg border border-blue-500/20">
                  <Database className="w-3 h-3 md:w-4 md:h-4 text-blue-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm md:text-[16px] font-black text-white leading-none">{panels.length}</span>
                  <span className="text-[7px] md:text-[8px] font-bold text-gray-500 uppercase tracking-widest">Produtos</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-16 md:top-24 right-2 sm:right-4 md:right-10 z-20 flex gap-2 md:gap-4">
        <button 
          onClick={() => setIsRotating(!isRotating)}
          className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center transition-all ${isRotating ? 'bg-blue-600 shadow-[0_0_30px_rgba(6,112,250,0.5)] text-white' : 'bg-zinc-900 border border-white/10 text-zinc-500 hover:text-white'}`}
          title="Alternar Rotação Global"
        >
          <RotateCw className={`w-4 h-4 md:w-6 md:h-6 ${isRotating ? 'animate-spin-slow' : ''}`} />
        </button>
        <button 
          onClick={() => setShowLegend(!showLegend)}
          className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center transition-all ${showLegend ? 'bg-white text-black' : 'bg-zinc-900 border border-white/10 text-white'}`}
          title="Alternar Legenda"
        >
          <Layers className="w-4 h-4 md:w-6 md:h-6" />
        </button>
      </div>

      <div className={`absolute top-28 sm:top-36 md:top-44 right-2 sm:right-4 md:right-10 z-10 transition-all duration-700 transform ${showLegend ? 'translate-x-0 opacity-100' : 'translate-x-20 opacity-0 pointer-events-none'}`}>
        <div className="bg-black/90 backdrop-blur-3xl border border-white/10 p-4 sm:p-6 md:p-10 rounded-2xl sm:rounded-[2rem] md:rounded-[3.5rem] w-48 sm:w-64 md:w-80 shadow-2xl max-h-[60vh] md:max-h-[70vh] overflow-hidden flex flex-col">
           <div className="flex items-center justify-between mb-4 md:mb-8 border-b border-white/10 pb-3 md:pb-6">
             <h3 className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-blue-400 uppercase tracking-wide md:tracking-[0.4em] flex items-center gap-2 md:gap-4">
               <Zap className="w-3 h-3 md:w-4 md:h-4 text-yellow-500" /> <span className="hidden sm:inline">Eixos Temáticos</span><span className="sm:hidden">Eixos</span>
             </h3>
           </div>
           <div className="space-y-2 md:space-y-3.5 flex-1 overflow-y-auto pr-1 md:pr-3 scrollbar-hide">
             {Object.keys(CLUSTER_COLORS).map(cat => {
               const count = panels.filter(p => p.group === cat).length;
               if (count === 0) return null;
               return (
                 <button 
                   key={cat} 
                   onClick={() => goToCluster(cat)}
                   className={`w-full flex items-center justify-between group py-2 md:py-3 px-3 md:px-5 rounded-xl md:rounded-2xl transition-all border ${selectedCluster === cat ? 'bg-blue-600/30 border-blue-500/50' : 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10'}`}
                 >
                   <div className="flex items-center gap-2 md:gap-4">
                      <div className="w-2 h-2 md:w-3 md:h-3 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: CLUSTER_COLORS[cat], color: CLUSTER_COLORS[cat] }}></div>
                      <span className={`text-[7px] sm:text-[8px] md:text-[9px] font-black uppercase tracking-wide md:tracking-widest transition-colors ${selectedCluster === cat ? 'text-white' : 'text-zinc-400 group-hover:text-white'}`}>{cat}</span>
                   </div>
                   <div className="flex items-center gap-1 md:gap-2">
                      <span className="text-[8px] md:text-[10px] text-zinc-600 font-bold">{count}</span>
                      {selectedCluster === cat && <Target className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-blue-500 animate-pulse" />}
                   </div>
                 </button>
               );
             })}
           </div>
           <button 
             onClick={() => {
                // Resetar ângulo de órbita para posição inicial
                clusterOrbitAngleRef.current = 0;
                frozenOrbitAngleRef.current = 0;
                
                fgRef.current?.cameraPosition({ x: 3500, y: 1800, z: 3500 }, { x: 0, y: 0, z: 0 }, 2000);
                setIsRotating(true);
                setSelectedCluster(null);
                setTranslationEnabled(true); // Reabilitar translação
                setNodeRotationEnabled(true); // Reabilitar rotação dos nós
                draggedNodesRef.current.clear(); // Limpar nós arrastados para voltar à órbita
             }}
             className="w-full mt-4 md:mt-8 py-3 md:py-5 bg-blue-600/10 border border-blue-500/30 rounded-xl md:rounded-3xl text-[7px] sm:text-[8px] md:text-[9px] font-black text-blue-400 uppercase tracking-wide md:tracking-[0.5em] hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2 md:gap-4"
           >
             <RotateCw className="w-3 h-3 md:w-4 md:h-4" />
             <span className="hidden sm:inline">Resetar Órbita</span><span className="sm:hidden">Reset</span>
           </button>
        </div>
      </div>

      {hoverNode && (
        <div className="fixed pointer-events-none z-[100] transform -translate-x-1/2 left-1/2 bottom-4 sm:bottom-8 md:bottom-20 animate-in zoom-in-90 fade-in duration-300 px-2 sm:px-4 w-full max-w-[95vw] sm:max-w-[80vw] md:max-w-[34rem]">
          <div className="bg-black/85 backdrop-blur-3xl border border-white/20 rounded-xl sm:rounded-2xl md:rounded-[2rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)]">
            <div className="flex items-center gap-3 sm:gap-4 md:gap-6 p-3 sm:p-4 md:p-6">
              {/* Thumbnail à esquerda */}
              <div className="w-14 h-14 sm:w-18 sm:h-18 md:w-24 md:h-24 flex-shrink-0 rounded-lg sm:rounded-xl md:rounded-2xl overflow-hidden border border-white/10">
                <img src={hoverNode.thumbnail} className="w-full h-full object-cover" alt={hoverNode.name} />
              </div>
              
              {/* Conteúdo central */}
              <div className="flex-1 min-w-0">
                <h2 className="font-orbitron text-xs sm:text-sm md:text-base font-black text-white uppercase tracking-wide leading-tight mb-1 md:mb-2 truncate">
                  {hoverNode.name}
                </h2>
                <p className="text-[10px] sm:text-xs text-zinc-400 leading-relaxed line-clamp-1 sm:line-clamp-2">
                  {hoverNode.description}
                </p>
              </div>
              
              {/* Botão à direita */}
              <button className="flex-shrink-0 px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] sm:text-xs uppercase tracking-wider md:tracking-widest rounded-lg transition-colors shadow-lg hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]">
                <span className="hidden sm:inline">Acessar</span>
                <span className="sm:hidden">Ver</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 50s linear infinite;
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};
