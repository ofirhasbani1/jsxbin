const path = require( 'path' )
const fs = require( 'fs' )

function GetESDInterface() {
	const platform = `${process.platform}`
	const platformArch = `${process.arch}`
	let esdinterface
	if ( platform === 'darwin' ) {
		esdinterface = require( path.resolve( __dirname, '..', 'esdebugger-core', 'mac', 'esdcorelibinterface.node' ) )
	} else if ( platform === 'win32' ) {
		if ( platformArch === 'x64' || platformArch === 'arm64' ) {
			esdinterface = require( path.resolve( __dirname, '..', 'esdebugger-core', 'win', 'x64', 'esdcorelibinterface.node' ) )
		} else {
			esdinterface = require( path.resolve( __dirname, '..', 'esdebugger-core', 'win', 'win32', 'esdcorelibinterface.node' ) )
		}
	}

	if ( esdinterface === undefined ) {
		throw new Error( `Platform not supported: ${platform}` )
	}

	return esdinterface
}

function getESDError() {
	const error = GetESDInterface().esdGetLastError()
	let message = 'unknown'
	if ( error.status !== 0 && error.data ) {
		message = error.data
	}
	throw new Error( `Error with ESTK: '${message}'` )
}

function convertFileContents( scriptPath ) {
	let content
	try {
		content = fs.readFileSync( scriptPath ).toString()
		if ( content ) {
			content = content.replace( /^\uFEFF/, '' )
		}
	} catch ( error ) {
		console.log( error )
		return null
	}

	const includePath = path.dirname( scriptPath )

	if ( content ) {
		const apiData = GetESDInterface().esdCompileToJSXBin( content, scriptPath, includePath )
		if ( apiData.status === 0 ) {
			return apiData.data
		}

		getESDError()
	}
}

let initialized = false

function initializeESDInterface() {
	if ( !initialized ) {
		const initData = GetESDInterface().esdInit()
		if ( initData.status === 0 ) {
			initialized = true
		} else {
			getESDError()
		}
	}
}

module.exports = function convertScripts( input, output ) {
	initializeESDInterface()
	for ( let i = 0; i < input.length; i++ ) {
		const scriptPath = input[i]
		const outputPath = output[i]
		const compiledContent = convertFileContents( scriptPath )
		if ( compiledContent ) {
			fs.writeFileSync( outputPath, compiledContent )
		} else {
			console.warn( `No compiled content found for '${scriptPath}'. Skipping.` )
		}
	}
}
