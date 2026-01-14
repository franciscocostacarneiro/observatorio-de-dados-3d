
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

      scene.children = scene.children.filter(c => !c.name?.startsWith('shell-') && !c.name?.startsWith('spatial-hud-'));

      const hubGroup = new THREE.Group();
      hubGroup.name = 'shell-hub';

      // === BURACO NEGRO SUPERMASSIVO ===
      
      // Singularidade - esfera completamente negra no centro
      const singularityGeo = new THREE.SphereGeometry(80, 64, 64);
      const singularityMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: false
      });
      const singularity = new THREE.Mesh(singularityGeo, singularityMat);
      hubGroup.add(singularity);

      // Sombra do buraco negro (photon sphere)
      const shadowGeo = new THREE.SphereGeometry(95, 64, 64);
      const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.98
      });
      hubGroup.add(new THREE.Mesh(shadowGeo, shadowMat));

      // Anel de fótons (photon ring) - o brilho característico ao redor do horizonte de eventos
      const photonRingGeo = new THREE.TorusGeometry(105, 8, 32, 128);
      const photonRingMat = new THREE.MeshBasicMaterial({
        color: 0xffcc66,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
      });
      const photonRing = new THREE.Mesh(photonRingGeo, photonRingMat);
      photonRing.rotation.x = Math.PI / 2.5;
      photonRing.name = 'photon-ring';
      hubGroup.add(photonRing);

      // Glow do anel de fótons
      const photonGlowGeo = new THREE.TorusGeometry(105, 25, 32, 128);
      const photonGlowMat = new THREE.MeshBasicMaterial({
        color: 0xff9933,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending
      });
      const photonGlow = new THREE.Mesh(photonGlowGeo, photonGlowMat);
      photonGlow.rotation.x = Math.PI / 2.5;
      hubGroup.add(photonGlow);

      // Disco de acreção - mais inclinado e com gradiente de cores (quente no centro, frio nas bordas)
      const accretionColors = [0xffffcc, 0xffdd88, 0xffaa44, 0xff7722, 0xcc4400, 0x882200, 0x441100, 0x220800];
      
      for (let i = 0; i < 12; i++) {
        const innerRadius = 120 + i * 22;
        const outerRadius = innerRadius + 18;
        const ringGeo = new THREE.RingGeometry(innerRadius, outerRadius, 128);
        const colorIndex = Math.min(i, accretionColors.length - 1);
        const ringMat = new THREE.MeshBasicMaterial({
          color: accretionColors[colorIndex],
          transparent: true,
          opacity: 0.25 - i * 0.015,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2.5;
        ring.rotation.z = i * 0.08;
        ring.name = `accretion-ring-${i}`;
        hubGroup.add(ring);
      }

      // Efeito de lensing gravitacional - anel de luz curvada atrás do buraco negro
      const lensingGeo = new THREE.RingGeometry(85, 130, 128);
      const lensingMat = new THREE.MeshBasicMaterial({
        color: 0xffeedd,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      const lensing = new THREE.Mesh(lensingGeo, lensingMat);
      lensing.rotation.x = Math.PI / 2.5 + Math.PI; // Atrás do disco
      lensing.position.z = -10;
      hubGroup.add(lensing);

      // Jatos relativísticos (perpendiculares ao disco)
      for (let j = 0; j < 2; j++) {
        const jetDirection = j === 0 ? 1 : -1;
        for (let i = 0; i < 6; i++) {
          const jetGeo = new THREE.ConeGeometry(15 - i * 2, 80, 16, 1, true);
          const jetMat = new THREE.MeshBasicMaterial({
            color: 0x6688ff,
            transparent: true,
            opacity: 0.15 - i * 0.02,
            blending: THREE.AdditiveBlending
          });
          const jet = new THREE.Mesh(jetGeo, jetMat);
          jet.position.y = jetDirection * (100 + i * 60);
          jet.rotation.x = jetDirection === -1 ? Math.PI : 0;
          jet.name = `jet-${j}-${i}`;
          hubGroup.add(jet);
        }
      }

      // Halo de poeira distante
      for (let i = 0; i < 3; i++) {
        const radius = 450 + i * 60;
        const torusGeo = new THREE.TorusGeometry(radius, 2, 16, 100);
        const torusMat = new THREE.MeshBasicMaterial({
          color: 0xaaaaaa,
          transparent: true,
          opacity: 0.04 - i * 0.01,
          blending: THREE.AdditiveBlending
        });
        const torus = new THREE.Mesh(torusGeo, torusMat);
        torus.rotation.x = Math.PI / 2.5;
        torus.name = `dust-ring-${i}`;
        hubGroup.add(torus);
      }

      scene.add(hubGroup);

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

      const starGeo = new THREE.BufferGeometry();
      const starPos = [];
      for(let i=0; i<35000; i++) {
        const r = 4000 + Math.random() * 4000;
        const u = Math.random(); const v = Math.random();
        const theta = 2 * Math.PI * u; const phi = Math.acos(2 * v - 1);
        starPos.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
      }
      starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
      const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ 
        color: 0x585858, 
        size: 1.5, 
        transparent: true, 
        opacity: 0.8, 
        blending: THREE.AdditiveBlending
      }));
      stars.name = 'shell-stars';
      scene.add(stars);

      fg.cameraPosition({ x: 3500, y: 1800, z: 3500 }, { x: 0, y: 0, z: 0 }, 3000);
    }
  }, [clusterCentroids, panels]);

  const createSpatialHUD = (text: string, color: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
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
    const spriteMaterial = new THREE.SpriteMaterial({ 
      map: texture, 
      transparent: true, 
      blending: THREE.AdditiveBlending,
      opacity: 0.9
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(180, 90, 1);
    return sprite;
  };

  const createTextSprite = (text: string, color: string, fontSize: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
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
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, blending: THREE.AdditiveBlending });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(fontSize * 18, fontSize * 9, 1);
    return sprite;
  };

  const nodeThreeObject = useCallback((node: any) => {
    const group = new THREE.Group();
    const isHovered = hoverNode?.id === node.id;
    const isRelated = hoverNode?.group === node.group;
    
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
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, node.color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,128,128);
    const glowTex = new THREE.CanvasTexture(canvas);
    const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ 
      map: glowTex, 
      transparent: true, 
      blending: THREE.AdditiveBlending,
      opacity: isHovered ? 1.0 : (isRelated ? 0.7 : 0.4)
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
