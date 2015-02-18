/*//////////////////////////////////////////////////////////////////////////////
================================================================================
        TYPO
          Chainable type checking and argument validation
          Check yourself before you wreck yourself
================================================================================
//////////////////////////////////////////////////////////////////////////////*/
 // By Chase Moskal
 // MIT Licensed


(function(moduleFactory){
	// AMD
	if (typeof define !== 'undefined' && define.amd)
		define(moduleFactory);

	// COMMON JS
	else if (typeof module !== 'undefined' && module.exports)
		module.exports = moduleFactory();

	// SCONE
	else if (typeof scone !== 'undefined')
		scone.declare('Scone/Typo.js', moduleFactory);

	// GLOBAL
	else this.Typo = moduleFactory();

})(function TYPO_MODULE (){
	'use strict';



	//==========================================================================
	//:::::: TESTS :::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//==========================================================================

	var tests = {};


	//////// SIMPLE TESTS //////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////

	tests.def   = function (x) { return x !== undefined };
	tests.undef = function (x) { return x === undefined };
	tests.nul   = function (x) { return x === null };
	tests.set   = function (x) { return tests.def(x) && !tests.nul(x) };
	tests.unset = function (x) { return !tests.set(x) };

	tests.truthy = function (x) { return !!x };
	tests.falsey = function (x) { return !x };

	tests.bool    = function (x) { return tests.set(x) && x.constructor === Boolean };
	tests.num     = function (x) { return tests.set(x) && x.constructor === Number };
	tests.integer = function (x) { return tests.num(x) && x%1 === 0 };
	tests.str     = function (x) { return tests.set(x) && x.constructor === String };

	tests.obj     = function (x) { return tests.set(x) && (x instanceof Object || typeof x == 'object') };
	tests.plob    = function (x) { return tests.set(x) && x.constructor === Object };
	tests.func    = function (x) { return tests.set(x) && x.constructor === Function };
	tests.arr     = function (x) { return tests.set(x) && x.constructor === Array };
	tests.arrlike = function (x) { return tests.set(x) && tests.num(x.length) };

	tests.regex = function (x) { return tests.set(x) && x.constructor === RegExp };
	
	tests.empty = function (x) {
		if (tests.arrlike(x)) {
			return (x.length === 0);
		} else if (tests.obj(x)) {
			return (Object.keys(x).length === 0);
		} else throw new Error("can only check if objects or arraylikes are empty");
	};
	tests.bearing = function (x) { return !tests.empty(x) };


	//////// COMPARISON TESTS //////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////

	tests.is   = function (x, y) { return x === y };
	tests.isnt = function (x, y) { return x !== y };

	tests.gt  = function (x, y) { return x > y };
	tests.lt  = function (x, y) { return x < y };
	tests.gte = function (x, y) { return x >= y };
	tests.lte = function (x, y) { return x <= y };


	//////// ADVANCED TESTS ////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////

	tests.has      = function (x, y) { return y in x };
	tests.contains = function (x, y) { return Array.prototype.indexOf.call(x, y) !== -1 };

	tests.test = function (x, y) {
		if (!tests.func(y)) throw new Error("Custom Typo tests must be functions");
		return y(x);
	};



	//==========================================================================
	//:::::: TYPO CHAIN CONSTRUCTOR ::::::::::::::::::::::::::::::::::::::::::::
	//==========================================================================

	function Typo (x, mode) {
		if (!(this instanceof Typo)) return new Typo(x, mode);

		this.x = x; // The value being scrutinized by the chain.
		this.d = undefined; // Default value

		if (mode === undefined)  mode = '&&';
		else if (mode === 'and') mode = '&&';
		else if (mode === 'all') mode = '&&';
		else if (mode === 'or')  mode = '||';
		else if (mode === 'any') mode = '||';
		this.mode = mode;

		this.pass = (mode === '||') ? false : true;
	}

	Typo.prototype.default = function (d) {
		this.d = d;
		return this;
	};


	//////// ALL CHAIN: MULTIPLE INPUTS ////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////

	function TypoAll (stuff, mode) {
		if (!(this instanceof TypoAll)) return new TypoAll(stuff, mode);
		if (!tests.arrlike(stuff)) throw new Error("TypoAll expects an array-like argument");
		Typo.call(this, stuff, mode);

		this.stuff = stuff;

		this.passing = [];
		for (var i=0, len=stuff.length; i<len; i+=1)
			this.passing[i] = (this.mode === '||') ? false : true;
	}

	TypoAll.prototype = Object.create(Typo.prototype);
	  // TypoAll inherits from Typo

	TypoAll.prototype.constructor = TypoAll;

	TypoAll.prototype.default = undefined;
	  // Disabling default functionality
	  // for all chains, because it only makes sense for single-inputs.

	Typo.All = Typo.all = TypoAll; // Attaching to Typo with synonym



	//==========================================================================
	//:::::: TEST IMPLEMENTATIONS ::::::::::::::::::::::::::::::::::::::::::::::
	//==========================================================================

	//////// INVERSION HANDLING ////////
	////////////////////////////////////

	Typo.inverter = Typo.inv = new function TypoInverter () {};
	  // Creating the uniquely identifiable inverter object

	function inversionHandling (args) {
		var ret = [];
		var invert = false;
		for (var i=0, len=args.length; i<len; i+=1) { // Inversion handling
			var arg = args[i];
			if (arg === Typo.inverter) invert = true;
			else ret.push(arg);
		}
		return { args: ret, invert: invert };
	}


	//////// RAW ACCESS ////////
	////////////////////////////

	Typo.tests = tests;


	//////// IMPLEMENTING EVERY TEST ////////
	/////////////////////////////////////////

	for (var key in tests) {
		var test = tests[key];


		//////// STATIC ////////////////////////////////////////////////////////
		////////////////////////////////////////////////////////////////////////
		 // Implementing static tests, like Typo.num(4)

		Typo[key] = (function(test){
			return function staticTypoTest () {
				var inv = inversionHandling(arguments);
				var pass = test.apply(this, inv.args);
				pass = (inv.invert === false) ? pass : !pass;
				return pass;
			};
		})(test);


		//////// STATIC (TYPO ALL) /////////////////////////////////////////////
		////////////////////////////////////////////////////////////////////////
		 // Implementing static tests for TypoAll, like Typo.num([4, 5, 6])

		TypoAll[key] = (function(test){
			return function allStaticTestImplementation (stuff) {
				if (!tests.arrlike(stuff) && tests.bearing(stuff)) throw new Error("Typo All tests must be given a bearing array-like");
				var inv = inversionHandling(arguments);

				inv.args.shift();
				var pass = true;
				for (var i=0, len=stuff.length; i<len; i+=1) {
					var sargs = [stuff[i]].concat(inv.args);
					pass = pass && test.apply(this, sargs);
					pass = (inv.invert === false) ? pass : !pass;
				};

				return pass;
			};
		})(test);


		//////// CHAIN TEST ////////////////////////////////////////////////////
		////////////////////////////////////////////////////////////////////////
		 // Implementing chain tests, like Typo(4).num().gt(-1).e().

		Typo.prototype[key] = (function(test){
			return function chainTestImplementation () {
				var inv = inversionHandling(arguments);

				inv.args.unshift(this.x);
				var pass = test.apply(this, inv.args);
				pass = (inv.invert === false) ? pass : !pass;

				this.pass = (this.mode === '||')
					? this.pass || pass
					: this.pass && pass;

				return this;
			};
		})(test);


		//////// CHAIN TEST (TYPO ALL) /////////////////////////////////////////
		////////////////////////////////////////////////////////////////////////
		 // Implementing chain tests for TypoAll,
		 //  like Typo([4, 5, 6]).num().gt(-1).e().

		TypoAll.prototype[key] = (function(test){
			return function chainTestAllImplementation () {
				var inv = inversionHandling(arguments);

				for (var i=0, len=this.stuff.length; i<len; i+=1) {
					var sargs = [this.stuff[i]].concat(inv.args);
					var pass = test.apply(this, sargs);
					pass = (inv.invert === false) ? pass : !pass;
					this.passing[i] = (this.mode === '||')
						? this.passing[i] || pass
						: this.passing[i] && pass;
				}

				var allTestsPass = !tests.contains(this.passing, false);
				this.pass = (this.mode === '||')
					? this.pass || allTestsPass
					: this.pass && allTestsPass;

				return this;
			};
		})(test);

	};



	//==========================================================================
	//:::::: CHAIN TERMINATION :::::::::::::::::::::::::::::::::::::::::::::::::
	//==========================================================================

	//////// CHAIN END ////////
	///////////////////////////
	 // Simply returns the boolean result of the whole chain.

	Typo.prototype.end = Typo.prototype.e = function end () { return this.pass };


	//////// CHAIN OR /////////
	///////////////////////////
	 // If passing, this method returns the originally provided value.
	 // If not passing, this method returns the given fallback value.
	 //   If the provided fallback is an error object, it will be thrown.
	 //   If no fallback is provided, a default error will be thrown.

	Typo.prototype.or = Typo.prototype.o = function endChain (y) {
		if (this.d !== undefined && this.x === undefined) return this.d;
		  // Default values

	 	if (this.pass) return this.x; // SUCCESSFUL VALUE, PASS IT BACK
		else { // CHAIN FAILED!
			if (y === undefined) throw new Error("Typo: Chain failed"); // Default chain error
			else if (y instanceof Error) throw y; // Custom error specified
			else return y; // Fallback value specified
		}
	};



	//==========================================================================
	//:::::: SYNONYMS ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//==========================================================================

	(function synonymize (a) {
		a.undefined      = a.undef;
		a.defined        = a.def;
		a.null           = a.nul;

		a.boolean        = a.bool;
		a.number         = a.num;
		a.int            = a.integer;
		a.string         = a.str;

		a.object         = a.obj;
		a.plainObject    = a.plob;
		a.function       = a.func;
		a.array          = a.arr;
		a.arrayLike      = a.arrlike;

		a.notEmpty       = a.bearing;
		a.regExp         = a.regex;

		a.greater        = a.gt;
		a.less           = a.lt;
		a.greaterOrEqual = a.gte;
		a.lessOrEqual    = a.lte;

		return synonymize;
	})
	 (Typo.tests)
	 (Typo)
	 (Typo.prototype)
	 (TypoAll)
	 (TypoAll.prototype);



	return Typo;
});