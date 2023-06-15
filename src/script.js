import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { NURBSSurface } from 'three/addons/curves/NURBSSurface.js';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';
let controls, mesh, renderer, scene, camera, effectController, exporter,  mat = {};
let radianX = 0 , radianY = 0, radianZ = 0 ;
let ambientLight;
let dirLight1, dirLight2, dirLight3 , dirLight4 ;
let helper1, helper2, helper3 , helper4 ;
let shape = {};
let morph0 , morph1;
let loader ;






init();
animate();

function init() {
    const divisions = 10;
    const size = 10;
    const gridHelper = new THREE.GridHelper( size, divisions );
    gridHelper.position.set(0,-1,0);
    
    creatreScene();

    createCamera();

    createRenderer();

    createControl();

    setupLights();

    const geometry = new THREE.BoxGeometry( 2, 2, 2 );
    const material = new THREE.MeshLambertMaterial( {  side: THREE.DoubleSide } );
    mesh = new THREE.Mesh( geometry, material );
    mesh.material.color.set( "grey" );
    mesh.position.set(0,1,0);

    scene.add( mesh );
    //scene.add( gridHelper );

    const axesHelper = new THREE.AxesHelper( 5 );
    //scene.add( axesHelper );
    
    scene.add( dirLight1 );
    //scene.add( helper1 );


    scene.add( dirLight2 );
    //scene.add( helper2 );

    scene.add( dirLight3 );
    //scene.add( helper3 );

  
    scene.add( dirLight4 );
    //scene.add( helper4 );

    scene.add( ambientLight );
    window.addEventListener( 'resize', onWindowResize );
    setupGui();
}

function animate() {
	requestAnimationFrame( animate );
    if(effectController.spin){
        radianX += 0.02;
        radianY += 0.01;
        radianZ += 0.01;
        mesh.rotation.x = radianX;
        mesh.rotation.y = radianY;
        mesh.rotation.z = radianZ;
    } else {
        radianX = 0;
        radianY = 0;
        radianZ = 0;
        mesh.rotation.x = 0;
        mesh.rotation.y = 0;
        mesh.rotation.z = 0;
    }
	
    controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true

	renderer.render( scene, camera );
}

function setupGui() {

    effectController = {
        width: 1,
        height : 1,
        depth : 1,
        torsion: 0,
        sphere : 0,
        spin: false,
        newShading: 'flat',
        exportGLTF : exportGLTF,
        tess : 5,
        shape : 'Box',
        upload : loadGLTFile,
        x : false,
        y : true,
        z : false
    };
    
    const gui = new GUI();
    const visuFolder = gui.addFolder("Vue");
    visuFolder.add(effectController, 'spin' ).name( 'Spining' );
    visuFolder.add(effectController, 'shape',['Box','Sphere']).name('Shape').onChange(render);
    visuFolder.add(effectController, 'newShading', [ 'wireframe', 'flat', 'smooth','basic' ] ).name( 'Shading' ).onChange(render);

    const effectFolder = gui.addFolder("Effet");
    effectFolder.add(effectController, 'sphere').min(-2).max(2).step(0.01).onChange(render);
    effectFolder.add(effectController,'torsion').min(-2).max(2).step(0.01).onChange(render);
    effectFolder.add(effectController, 'width').min( 0 ).max( 2 ).onChange(render);
    effectFolder.add(effectController, 'height').min( 0 ).max( 2 ).onChange(render);
    effectFolder.add(effectController, 'depth').min( 0 ).max( 2 ).onChange(render);
    effectFolder.add(effectController, 'tess').min(1).max(64).step(1).onChange(render);
    const torsionFolder = gui.addFolder("Sens de torsion ")
    torsionFolder.add(effectController, 'x' ).name( 'X' );
    torsionFolder.add(effectController, 'y' ).name( 'Y' );
    torsionFolder.add(effectController, 'z' ).name( 'Z' );

    const exportFolder = gui.addFolder('Fichier')
    exportFolder.add(effectController, 'exportGLTF' ).name( 'Télécharger ' );
    exportFolder.add(effectController, 'upload').name('upload');
    exportFolder.close();


}




function render() {
    if(effectController.shape == 'Box'){
        renderCube();
    }else if(effectController.shape == 'Sphere'){
        renderShpere();
    }else if (effectController.shape == 'upload') {
        renderUploadedShape();
    }
}




function renderCube() {
   
    if ( mesh !== undefined ) {

        mesh.geometry.dispose();
        scene.remove( mesh );

    }
    mat['wireframe'] = new THREE.MeshStandardMaterial( { wireframe: true } );
    mat['flat'] = new THREE.MeshPhongMaterial( { specular: 0x000000, flatShading: true, side: THREE.DoubleSide } );
    mat['smooth'] = new THREE.MeshLambertMaterial( { side: THREE.DoubleSide } );
    mat['basic'] = new THREE.MeshBasicMaterial();

    // const geometry = new THREE.BoxGeometry( effectController.height,effectController.width, effectController.depth, effectController.tess, effectController.tess,effectController.tess );
    shape['Box'] = new THREE.BoxGeometry( effectController.height,effectController.width, effectController.depth, effectController.tess, effectController.tess,effectController.tess );
    shape['Sphere']= new THREE.SphereGeometry(effectController.height,effectController.tess,effectController.tess);
    shape[effectController.shape].morphAttributes.position = [];

    const positionAttribute = shape[effectController.shape].attributes.position;
    
	// for the first morph target we'll move the mesh's vertices onto the surface of a sphere
	const spherePositions = [];
	// for the second morph target, we'll twist the meshs vertices
	const twistPositions = [];
	const direction = new THREE.Vector3( effectController.x, effectController.y, effectController.z ); // choisir le sens de la torsion ( x y z )
	const vertex = new THREE.Vector3();
    
	for ( let i = 0; i < positionAttribute.count ; i ++ ) {
            const x = positionAttribute.getX( i );
	        const y = positionAttribute.getY( i );
	        const z = positionAttribute.getZ( i );
            spherePositions.push(
                x * Math.sqrt( 1 - ( y * y / 2 ) - ( z * z / 2 ) + ( y * y * z * z / 3 ) ),
                y * Math.sqrt( 1 - ( z * z / 2 ) - ( x * x / 2 ) + ( z * z * x * x / 3 ) ),
                z * Math.sqrt( 1 - ( x * x / 2 ) - ( y * y / 2 ) + ( x * x * y * y / 3 ) )
                );
            // stretch along the x-axis so we can see the twist better
            vertex.set( x, y * 2 , z );
            vertex.applyAxisAngle( direction, Math.PI * y / 2 ).toArray( twistPositions, twistPositions.length );
   
        }
	    
    
	// add the spherical positions as the first morph target
	shape[effectController.shape].morphAttributes.position[ 0 ] = new THREE.Float32BufferAttribute( spherePositions, 3 );
	// add the twisted positions as the second morph target
	shape[effectController.shape].morphAttributes.position[ 1 ] = new THREE.Float32BufferAttribute( twistPositions, 3 );

    mesh = new THREE.Mesh( shape[effectController.shape], mat[effectController.newShading] );
    mesh.morphTargetInfluences[ 0 ] = effectController.sphere;
    mesh.morphTargetInfluences[ 1 ] = effectController.torsion;

    addMeshToScene();

}



function renderShpere() {
    if ( mesh !== undefined ) {

        mesh.geometry.dispose();
        scene.remove( mesh );

    }

    mat['wireframe'] = new THREE.MeshStandardMaterial( { wireframe: true } );
    mat['flat'] = new THREE.MeshPhongMaterial( { specular: 0x000000, flatShading: true, side: THREE.DoubleSide } );
    mat['smooth'] = new THREE.MeshLambertMaterial( { side: THREE.DoubleSide } );
    mat['basic'] = new THREE.MeshBasicMaterial();

    shape['Box'] = new THREE.BoxGeometry( effectController.height,effectController.width, effectController.depth, effectController.tess, effectController.tess,effectController.tess );
    shape['Sphere']= new THREE.SphereGeometry(effectController.height,effectController.tess,effectController.tess);
    shape[effectController.shape].morphAttributes.position = [];


    const positionAttribute = shape[effectController.shape].attributes.position;
    
	// for the first morph target we'll move the mesh's vertices onto the surface of a sphere
	const spherePositions = [];
	// for the second morph target, we'll twist the meshs vertices
	const twistPositions = [];
	const direction = new THREE.Vector3( effectController.x, effectController.y, effectController.z ); // choisir le sens de la torsion ( x y z )
	const vertex = new THREE.Vector3();
    
	for ( let i = 0; i < positionAttribute.count ; i ++ ) {
            const x = positionAttribute.getX( i );
	        const y = positionAttribute.getY( i );
	        const z = positionAttribute.getZ( i );
            spherePositions.push(
                x * Math.sqrt( 1 - ( y * y / 2 ) - ( z * z / 2 ) + ( y * y * z * z / 3 ) ),
                y * Math.sqrt( 1 - ( z * z / 2 ) - ( x * x / 2 ) + ( z * z * x * x / 3 ) ),
                z * Math.sqrt( 1 - ( x * x / 2 ) - ( y * y / 2 ) + ( x * x * y * y / 3 ) )
                );
            // stretch along the x-axis so we can see the twist better
            vertex.set( x, y * 2 , z );
            vertex.applyAxisAngle( direction, Math.PI * y / 2 ).toArray( twistPositions, twistPositions.length );
   
        }
	    
    

	// add the spherical positions as the first morph target
	shape[effectController.shape].morphAttributes.position[ 0 ] = new THREE.Float32BufferAttribute( spherePositions, 3 );
	// add the twisted positions as the second morph target
	shape[effectController.shape].morphAttributes.position[ 1 ] = new THREE.Float32BufferAttribute( twistPositions, 3 );

    mesh = new THREE.Mesh( shape[effectController.shape], mat[effectController.newShading] );
    mesh.morphTargetInfluences[ 0 ] = effectController.sphere;
    mesh.morphTargetInfluences[ 1 ] = effectController.torsion;
    addMeshToScene();
   
}

function renderUploadedShape(){
    const meshCopyGeo = mesh.geometry;
    if ( mesh !== undefined ) {

        mesh.geometry.dispose();
        scene.remove( mesh );

    }
    mat['wireframe'] = new THREE.MeshStandardMaterial( { wireframe: true } );
    mat['flat'] = new THREE.MeshPhongMaterial( { specular: 0x000000, flatShading: true, side: THREE.DoubleSide } );
    mat['smooth'] = new THREE.MeshLambertMaterial( { side: THREE.DoubleSide } );
    mat['basic'] = new THREE.MeshBasicMaterial();
    const cube = new THREE.BoxGeometry( effectController.height,effectController.width, effectController.depth, effectController.tess, effectController.tess,effectController.tess );
    cube.morphAttributes.position = [];

    const positionAttribute = cube.attributes.position;

	// for the first morph target we'll move the mesh's vertices onto the surface of a sphere
	const spherePositions = [];
	// for the second morph target, we'll twist the meshs vertices
	const twistPositions = [];
	const direction = new THREE.Vector3( 0, 1, 0 ); // choisir le sens de la torsion ( x y z )
	const vertex = new THREE.Vector3();

	for ( let i = 0; i < positionAttribute.count ; i ++ ) {
		const x = positionAttribute.getX( i );
		const y = positionAttribute.getY( i );
		const z = positionAttribute.getZ( i );
		spherePositions.push(
			x * Math.sqrt( 1 - ( y * y / 2 ) - ( z * z / 2 ) + ( y * y * z * z / 3 ) ),
			y * Math.sqrt( 1 - ( z * z / 2 ) - ( x * x / 2 ) + ( z * z * x * x / 3 ) ),
			z * Math.sqrt( 1 - ( x * x / 2 ) - ( y * y / 2 ) + ( x * x * y * y / 3 ) )
            );
		// stretch along the x-axis so we can see the twist better
		vertex.set( x, y * 2 , z );
		vertex.applyAxisAngle( direction, Math.PI * y / 2 ).toArray( twistPositions, twistPositions.length );
        }
    
	// add the spherical positions as the first morph target
	cube.morphAttributes.position[ 0 ] = new THREE.Float32BufferAttribute( spherePositions, 3 );
	// add the twisted positions as the second morph target
	cube.morphAttributes.position[ 1 ] = new THREE.Float32BufferAttribute( twistPositions, 3 );


    mesh = new THREE.Mesh( cube, mat[effectController.newShading] );
    
    mesh.morphTargetInfluences[ 0 ] = effectController.sphere + morph0;
    mesh.morphTargetInfluences[ 1 ] = effectController.torsion + morph1;

    addMeshToScene();

}


function exportGLTF() {
    exporter = new GLTFExporter();
    mesh.rotation.x = 0;
    mesh.rotation.y = 0;    
    exporter.parse( mesh, function ( result ) {

        if ( result instanceof ArrayBuffer ) {

            saveArrayBuffer( result, 'scene.glb' );

        } else {

            const output = JSON.stringify( result, null, 2 );
            console.log( output );
            saveString( output, 'scene.gltf' );

        }

    }, 
    function ( error ) {

        console.log( 'An error happened during parsing', error );

    },
    { binary: true }
    
    );


}

function saveArrayBuffer( buffer, filename ) {

    save( new Blob( [ buffer ], { type: 'application/octet-stream' } ), filename );

}


function saveString( text, filename ) {

    save( new Blob( [ text ], { type: 'text/plain' } ), filename );

}
const link = document.createElement( 'a' );
			link.style.display = 'none';
			document.body.appendChild( link );

function save( blob, filename ) {

    link.href = URL.createObjectURL( blob );
    link.download = filename;
    link.click();

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}

function creatreScene(){
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x8FBCD4 );

}
function createCamera() {
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    camera.position.set( 0, 3, 5 );
}

function createRenderer() {
    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    //document.body.appendChild( renderer.domElement );
    document.getElementById("3d").appendChild(renderer.domElement);

}

function createControl() {
    controls = new OrbitControls( camera, renderer.domElement );
    controls.listenToKeyEvents( window ); // optio
    //controls.addEventListener( 'change', renderer ); // call this only in static scenes (i.e., if there is no animation lo

    controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 2;
}

function setupLights() {
    dirLight1 = new THREE.DirectionalLight( 0xffffff );
    dirLight1.position.set( 6, 2, 6);
    helper1 = new THREE.DirectionalLightHelper( dirLight1, 1 );
    
    //scene.add( helper1 );

    dirLight2 = new THREE.DirectionalLight( 0xffffff );
    dirLight2.position.set( -6, 2, 6 );
    helper2 = new THREE.DirectionalLightHelper( dirLight2, 1 );
    //scene.add( helper2 );

    dirLight3 = new THREE.DirectionalLight( 0xffffff, 0.5 );
    dirLight3.position.set( -6, 2, -6 );
    helper3 = new THREE.DirectionalLightHelper( dirLight3, 1 );
    //scene.add( helper3 );

    dirLight4 = new THREE.DirectionalLight( 0xffffff , 0.5);
    dirLight4.position.set( 6, 2, -6 );
    helper4 = new THREE.DirectionalLightHelper( dirLight4, 1 );
    //scene.add( helper4 );

    ambientLight = new THREE.AmbientLight( 0x4d4c4c  );
   
}

function addMeshToScene(){
    scene.add(mesh)
    mesh.material.color.set( "grey" );
    mesh.position.set(0,1,0)
    mesh.rotation.x = radianX;
    mesh.rotation.y = radianY;
    mesh.rotation.z = radianZ;
}

function loadGLTFile(URL) {
    loader = new GLTFLoader();
    effectController.shape = 'upload';

    loader.load( URL, function ( gltf ) {
        if ( mesh !== undefined ) {

            mesh.geometry.dispose();
            scene.remove( mesh );
    
        }
        mesh = gltf.scene.children[0];
        morph0 = mesh.morphTargetInfluences[0];
        morph1 = mesh.morphTargetInfluences[1];
        scene.add( mesh );
    
    }, undefined, function ( error ) {
    
        console.error( error );
    
    } );
}


document.addEventListener( 'dragover', function ( event ) {

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';

} );


document.addEventListener( 'drop', function ( event ) {

    event.preventDefault();

    if ( event.dataTransfer.types[ 0 ] === 'text/plain' ) return; // Outliner drop

    if ( event.dataTransfer.items ) {
        // DataTransferItemList supports folders
        [...event.dataTransfer.items].forEach((item, i) => {
            // If dropped items aren't files, reject them
            if (item.kind === "file") {
              const file = item.getAsFile();
              console.log(file);
              console.log(`… file[${i}].name = ${file.name}`);
              const url = URL.createObjectURL(file);
              loadGLTFile(url);
              //const arrayBuffer = await file.arrayBuffer();
            }
          });
        //editor.loader.loadItemList( event.dataTransfer.items );

    } else {
        console.log("hello2");

        console.log(event.dataTransfer.files);
        //editor.loader.loadFiles( event.dataTransfer.files );

    }

} );
// save en glb 
// faut stop le spin et mettre en basic mat
// puis mettre sur blender 
// save en slt
// mettre dans prusa 



// rajouter un truc qui recup le glb pour le reinjecter dedans 
// checker pour dl en stl directement 
// quand tu es en mode mesh, get le mesh sans changer, genre comme faire dans le render
// peut etre utiliser un switch case ?? 
// deployer le site pour vanessa


// ajouter le drap and drop ( ex en message sur slack )
// pour load un fichier juste changer le hmtml et rajoyer un endroit ou laod le ficher (copier exemple three js )