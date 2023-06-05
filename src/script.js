import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
let controls, cube, renderer, scene, camera, effectController, exporter,  mat = {};;
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';


init();
animate();

function init() {
    const divisions = 10;
    const size = 10;
    const gridHelper = new THREE.GridHelper( size, divisions );
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    camera.position.set( 0, 2, 5 );

    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    controls = new OrbitControls( camera, renderer.domElement );
    controls.listenToKeyEvents( window ); // optio
    //controls.addEventListener( 'change', renderer ); // call this only in static scenes (i.e., if there is no animation lo

    controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 2;

    const geometry = new THREE.BoxGeometry( 1, 1, 1 );
    const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    cube = new THREE.Mesh( geometry, material );
    scene.background = new THREE.Color( 0xcccccc );
    cube.material.color.set( "blue" );
    cube.position.set(0,1,0)
    scene.add( cube );
    scene.add( gridHelper );
    
    const dirLight1 = new THREE.DirectionalLight( 0xffffff );
    dirLight1.position.set( 6, 2, 6);
    const helper1 = new THREE.DirectionalLightHelper( dirLight1, 1 );
    scene.add( dirLight1 );
    scene.add( helper1 );

    const dirLight2 = new THREE.DirectionalLight( 0xffffff );
    dirLight2.position.set( -6, 2, 6 );
    const helper2 = new THREE.DirectionalLightHelper( dirLight2, 1 );
    scene.add( dirLight2 );
    scene.add( helper2 );

    const ambientLight = new THREE.AmbientLight( 0x4d4c4c  );
    scene.add( ambientLight );
    setupGui();
}
function animate() {
	requestAnimationFrame( animate );
    if(effectController.spin){
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
    } else {
        cube.rotation.x = 0;
        cube.rotation.y = 0;
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
        spin: true,
        newShading: 'flat',
        exportGLTF : exportGLTF,
        tess : 1
    };
    
    const gui = new GUI();
    
    gui.add( effectController, 'spin' ).name( 'Spining' );
    gui.add( effectController, 'newShading', [ 'wireframe', 'flat' ] ).name( 'Shading' ).onChange(render);
    gui.add(effectController, 'sphere').min(0).max(1).step(0.01).onChange(render);
    gui.add(effectController,'torsion').min(0).max(1).step(0.01).onChange(render);
    gui.add(effectController, 'width').min( 0 ).max( 2 ).onChange(render);
    gui.add(effectController, 'height').min( 0 ).max( 2 ).onChange(render);
    gui.add(effectController, 'depth').min( 0 ).max( 2 ).onChange(render);
    gui.add(effectController, 'tess').min(1).max(64).step(1).onChange(render);
    gui.add(effectController, 'exportGLTF' ).name( 'Export' );

}







function render() {
    renderCube();
}

function renderCube() {
   
    if ( cube !== undefined ) {

        cube.geometry.dispose();
        scene.remove( cube );

    }
    mat[ 'wireframe' ] = new THREE.MeshBasicMaterial( { wireframe: true } );
	mat[ 'flat' ] = new THREE.MeshPhongMaterial( { specular: 0x000000, flatShading: true, side: THREE.DoubleSide } );
    const geometry = new THREE.BoxGeometry( effectController.height,effectController.width, effectController.depth, effectController.tess, effectController.tess,effectController.tess );

    geometry.morphAttributes.position = [];

    const positionAttribute = geometry.attributes.position;

	// for the first morph target we'll move the cube's vertices onto the surface of a sphere
	const spherePositions = [];
	// for the second morph target, we'll twist the cubes vertices
	const twistPositions = [];
	const direction = new THREE.Vector3( 1, 0, 0 );
	const vertex = new THREE.Vector3();
	for ( let i = 0; i < positionAttribute.count; i ++ ) {
		const x = positionAttribute.getX( i );
		const y = positionAttribute.getY( i );
		const z = positionAttribute.getZ( i );
		spherePositions.push(
			x * Math.sqrt( 1 - ( y * y / 2 ) - ( z * z / 2 ) + ( y * y * z * z / 3 ) ),
			y * Math.sqrt( 1 - ( z * z / 2 ) - ( x * x / 2 ) + ( z * z * x * x / 3 ) ),
			z * Math.sqrt( 1 - ( x * x / 2 ) - ( y * y / 2 ) + ( x * x * y * y / 3 ) )
            );
		// stretch along the x-axis so we can see the twist better
		vertex.set( x * 2, y, z );
		vertex.applyAxisAngle( direction, Math.PI * x / 2 ).toArray( twistPositions, twistPositions.length );
        }
	// add the spherical positions as the first morph target
	geometry.morphAttributes.position[ 0 ] = new THREE.Float32BufferAttribute( spherePositions, 3 );
	// add the twisted positions as the second morph target
	geometry.morphAttributes.position[ 1 ] = new THREE.Float32BufferAttribute( twistPositions, 3 );

    cube = new THREE.Mesh( geometry, mat[effectController.newShading] );
    cube.morphTargetInfluences[ 0 ] = effectController.sphere;
    cube.morphTargetInfluences[ 1 ] = effectController.torsion;
    scene.add(cube)
    cube.material.color.set( "grey" );
    cube.position.set(0,1,0)

}


function exportGLTF() {
    exporter = new GLTFExporter();
    exporter.parse( scene, function ( result ) {

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


// save en glb 
// puis mettre sur blender 
// save en slt
// mettre dans prusa 

// checker les erreus chelou dans la consol

// checker dautre deformation possible maybe 
// jouer avec le nombre de tesselation 
// la couleur pour mieux voir ( gener des light)
