// *******************************************************
// CS 174a Graphics Example Code
// animation.js - The main file and program start point.  The class definition here describes how to display an Animation and how it will react to key and mouse input.  Right now it has 
// very little in it - you will fill it in with all your shape drawing calls and any extra key / mouse controls.  

// Now go down to display() to see where the sample shapes are drawn, and to see where to fill in your own code.

"use strict";
var canvas, canvas_size, gl = null, g_addrs,
    movement = vec2(), thrust = vec3(), looking = false, prev_time = 0, animate = false, animation_time = 0;
var gouraud = false, color_normals = false, solid = false;
function CURRENT_BASIS_IS_WORTH_SHOWING(self, model_transform) {
    self.m_axis.draw(self.basis_id++, self.graphicsState, model_transform, new Material(vec4(.8, .3, .8, 1), 1, 1, 1, 40, ""));
}


// *******************************************************	
// When the web page's window loads it creates an "Animation" object.  It registers itself as a displayable object to our other class "GL_Context" -- which OpenGL is told to call upon every time a
// draw / keyboard / mouse event happens.

window.onload = function init() {
    var anim = new Animation();
};

function Animation() {
    (function init(self) {
        self.context = new GL_Context("gl-canvas");
        self.context.register_display_object(self);

        gl.clearColor(0, 0, 0, 1);	// Background color

        self.m_cube = new cube();
        self.m_obj = new shape_from_file("teapot.obj");
        self.m_axis = new axis();
        self.m_sphere = new sphere(mat4(), 4);
        self.m_fan = new triangle_fan_full(10, mat4());
        self.m_strip = new rectangular_strip(1, mat4());
        self.m_cylinder = new cylindrical_strip(10, mat4());

        // 1st parameter is camera matrix.  2nd parameter is the projection:  The matrix that determines how depth is treated.  It projects 3D points onto a plane.
        self.graphicsState = new GraphicsState(translate(0, 0, -40), perspective(45, canvas.width / canvas.height, .1, 1000), 0);

        gl.uniform1i(g_addrs.GOURAUD_loc, gouraud);
        gl.uniform1i(g_addrs.COLOR_NORMALS_loc, color_normals);
        gl.uniform1i(g_addrs.SOLID_loc, solid);

        self.context.render();
    })(this);

    canvas.addEventListener('mousemove', function (e) {
        e = e || window.event;
        movement = vec2(e.clientX - canvas.width / 2, e.clientY - canvas.height / 2, 0);
    });
}

// *******************************************************	
// init_keys():  Define any extra keyboard shortcuts here
Animation.prototype.init_keys = function () {
    shortcut.add("Space", function () {
        thrust[1] = -1;
    });
    shortcut.add("Space", function () {
        thrust[1] = 0;
    }, {'type': 'keyup'});
    shortcut.add("z", function () {
        thrust[1] = 1;
    });
    shortcut.add("z", function () {
        thrust[1] = 0;
    }, {'type': 'keyup'});
    shortcut.add("w", function () {
        thrust[2] = 1;
    });
    shortcut.add("w", function () {
        thrust[2] = 0;
    }, {'type': 'keyup'});
    shortcut.add("a", function () {
        thrust[0] = 1;
    });
    shortcut.add("a", function () {
        thrust[0] = 0;
    }, {'type': 'keyup'});
    shortcut.add("s", function () {
        thrust[2] = -1;
    });
    shortcut.add("s", function () {
        thrust[2] = 0;
    }, {'type': 'keyup'});
    shortcut.add("d", function () {
        thrust[0] = -1;
    });
    shortcut.add("d", function () {
        thrust[0] = 0;
    }, {'type': 'keyup'});
    shortcut.add("f", function () {
        looking = !looking;
    });
    shortcut.add(",", (function (self) {
        return function () {
            self.graphicsState.camera_transform = mult(rotate(3, 0, 0, 1), self.graphicsState.camera_transform);
        };
    })(this));
    shortcut.add(".", (function (self) {
        return function () {
            self.graphicsState.camera_transform = mult(rotate(3, 0, 0, -1), self.graphicsState.camera_transform);
        };
    })(this));

    shortcut.add("r", (function (self) {
        return function () {
            self.graphicsState.camera_transform = mat4();
        };
    })(this));
    shortcut.add("ALT+s", function () {
        solid = !solid;
        gl.uniform1i(g_addrs.SOLID_loc, solid);
        gl.uniform4fv(g_addrs.SOLID_COLOR_loc, vec4(Math.random(), Math.random(), Math.random(), 1));
    });
    shortcut.add("ALT+g", function () {
        gouraud = !gouraud;
        gl.uniform1i(g_addrs.GOURAUD_loc, gouraud);
    });
    shortcut.add("ALT+n", function () {
        color_normals = !color_normals;
        gl.uniform1i(g_addrs.COLOR_NORMALS_loc, color_normals);
    });
    shortcut.add("ALT+a", function () {
        animate = !animate;
    });

    shortcut.add("p", (function (self) {
        return function () {
            self.m_axis.basis_selection++;
            console.log("Selected Basis: " + self.m_axis.basis_selection);
        };
    })(this));
    shortcut.add("m", (function (self) {
        return function () {
            self.m_axis.basis_selection--;
            console.log("Selected Basis: " + self.m_axis.basis_selection);
        };
    })(this));
};

function update_camera(self, animation_delta_time) {
    var leeway = 70, border = 50;
    var degrees_per_frame = .0005 * animation_delta_time;
    var meters_per_frame = .03 * animation_delta_time;
    // Determine camera rotation movement first
    var movement_plus = [movement[0] + leeway, movement[1] + leeway];	// movement[] is mouse position relative to canvas center; leeway is a tolerance from the center.
    var movement_minus = [movement[0] - leeway, movement[1] - leeway];
    var outside_border = false;

    for (var i = 0; i < 2; i++)
        if (Math.abs(movement[i]) > canvas_size[i] / 2 - border)    outside_border = true;	// Stop steering if we're on the outer edge of the canvas.

    for (var i = 0; looking && outside_border == false && i < 2; i++)			// Steer according to "movement" vector, but don't start increasing until outside a leeway window from the center.
    {
        var velocity = ( ( movement_minus[i] > 0 && movement_minus[i] ) || ( movement_plus[i] < 0 && movement_plus[i] ) ) * degrees_per_frame;	// Use movement's quantity unless the &&'s zero it out
        self.graphicsState.camera_transform = mult(rotate(velocity, i, 1 - i, 0), self.graphicsState.camera_transform);			// On X step, rotate around Y axis, and vice versa.
    }
    self.graphicsState.camera_transform = mult(translate(scale_vec(meters_per_frame, thrust)), self.graphicsState.camera_transform);		// Now translation movement of camera, applied in local camera coordinate frame
}


/**
 * Called once per frame whenever OpenGL decides it's time to redraw.
 * @param time
 */
Animation.prototype.display = function (time) {
    if (!time) {
        time = 0;
    }

    this.animation_delta_time = time - prev_time;
    if (animate) {
        this.graphicsState.animation_time += this.animation_delta_time;
    }

    prev_time = time;

    update_camera(this, this.animation_delta_time);

    this.basis_id = 0;

    var model_transform = mat4();

    var ground_transform = this.ground(mult(model_transform, translate(0, -5, 0))); // Draw the ground below centerline
    var tree = this.tree(mult(ground_transform, translate(2, 0, 2))); // Draw tree off-center from ground
    var bee = this.bee(mult(tree, translate(0, 3, 0))); // Orbit bee around tree

};

/**
 * Generates a vec4 object from RGB values.
 * @param red RGB red value
 * @param green RGB green value
 * @param blue RGB blue value
 * @param alpha RGB alpha value
 * @returns {*} Get vec4 RGB object
 */
var getColorVec = function (red, green, blue, alpha) {
    return vec4(red / 255.0, green / 255.0, blue / 255.0, alpha / 255.0);
};

/**
 * Pivots a matrix periodically.
 * @param model_transform Current matrix
 * @param period Period in milliseconds to pivot
 * @param maxPivot Max angle in degrees to pivot
 * @returns {*} Pivoting matrix
 */
Animation.prototype.periodicPivot = function (model_transform, period, maxPivot) {
    var swaySpeed = period / 4 / maxPivot;

    var time = this.graphicsState.animation_time % period;
    if (time >= 0 && time < period / 4) {
        model_transform = mult(model_transform, rotate((time - 0) / swaySpeed, 0, 0, 0.5));
    } else if (time >= period / 4 && time < period / 2) {
        model_transform = mult(model_transform, rotate((time - period / 4) / -swaySpeed + maxPivot, 0, 0, 0.5));
    } else if (time >= period / 2 && time < period * 3 / 4) {
        model_transform = mult(model_transform, rotate((time - period / 2) / -swaySpeed, 0, 0, 0.5));
    } else {
        model_transform = mult(model_transform, rotate((time - period * 3 / 4) / swaySpeed - maxPivot, 0, 0, 0.5));
    }

    return model_transform;
};

/**
 * Draws a stretched out and flattened cube to represent the ground plane.
 * @param model_transform Current matrix
 * @returns {*} Origin matrix
 */
Animation.prototype.ground = function (model_transform) {
    var GROUND_TEXTURE = new Material(getColorVec(60, 215, 30, 255), 1, 1, 1, 40);
    var GROUND_WIDTH = 100;
    var origin = model_transform;

    model_transform = mult(model_transform, scale(GROUND_WIDTH, 0.1, GROUND_WIDTH));
    this.m_cube.draw(this.graphicsState, model_transform, GROUND_TEXTURE);

    return origin;
};

/**
 * Draws a multi-part tree that sways left and right.
 * @param model_transform Current matrix
 * @returns {*} Matrix centered at tree base
 */
Animation.prototype.tree = function (model_transform) {
    var NUM_SECTIONS = 7;
    var FOLIAGE_TEXTURE = new Material(getColorVec(30, 120, 30, 250), 1, 0.5, 0.5, 100);
    var origin = model_transform;

    // Draw trunk sections
    for (var trunkSection = 0; trunkSection < NUM_SECTIONS; trunkSection++) {
        model_transform = this.treeTrunkSection(model_transform);
    }

    // Draw foliage
    model_transform = mult(model_transform, scale(2, 2, 2));
    this.m_sphere.draw(this.graphicsState, model_transform, FOLIAGE_TEXTURE);

    return origin;
};

/**
 * Draws a tree trunk section that sways left and right around its origin.
 * @param model_transform Current matrix
 * @returns {*} Matrix centered at top of trunk section.
 */
Animation.prototype.treeTrunkSection = function (model_transform) {
    var TRUNK_HEIGHT = 1;
    var TRUNK_WIDTH = 0.2;
    var SWAY_PERIOD = 4000; // milliseconds
    var MAX_SWAY = 2; // degrees
    var TRUNK_TEXTURE = new Material(getColorVec(55, 45, 20, 255), 1, 1, 1, 40);

    model_transform = this.periodicPivot(model_transform, SWAY_PERIOD, MAX_SWAY);
    var origin = model_transform = mult(model_transform, translate(0, TRUNK_HEIGHT, 0));
    model_transform = mult(model_transform, translate(0, -TRUNK_HEIGHT / 2, 0)); // Move trunk center halfway up
    model_transform = mult(model_transform, scale(TRUNK_WIDTH, TRUNK_HEIGHT, TRUNK_WIDTH));
    this.m_cube.draw(this.graphicsState, model_transform, TRUNK_TEXTURE);

    return origin;
};

/**
 * Draws an orbiting bee.
 * @param model_transform Current matrix
 * @returns {*} Matrix at orbit center
 */
Animation.prototype.bee = function (model_transform) {
    var BEE_SCALE = 0.5;
    var MAX_HEIGHT_CHANGE = 1;
    var VERTICAL_PERIOD = 4000; // milliseconds
    var RADIUS = 7;
    var BEE_BODY_TEXTURE = new Material(getColorVec(10, 10, 10, 255), 1, 1, 1, 255);
    var BEE_ABDOMEN_TEXTURE = new Material(getColorVec(230, 200, 0, 255), 1, 1, 1, 255);

    var origin = model_transform;
    // Orbit bee clockwise at radius
    model_transform = mult(model_transform, rotate(this.graphicsState.animation_time / -20, 0, 1, 0));
    var bee = mult(model_transform, translate(RADIUS, 0, 0));

    // Move bee up and down
    var y = Math.sin(this.graphicsState.animation_time / VERTICAL_PERIOD * 4);
    bee = mult(bee, translate(0, y * MAX_HEIGHT_CHANGE, 0));

    // Scale bee
    bee = mult(bee, scale(BEE_SCALE, BEE_SCALE, BEE_SCALE));

    // Draw bee
    var beeThorax = mult(bee, scale(1.5, 1.5, 3));
    this.m_cube.draw(this.graphicsState, beeThorax, BEE_BODY_TEXTURE);

    var beeHead = mult(bee, translate(0, 0, 2.5));
    beeHead = mult(beeHead, scale(1, 1, 1));
    this.m_sphere.draw(this.graphicsState, beeHead, BEE_BODY_TEXTURE);

    var beeAbdomen = mult(bee, translate(0, 0, -2.25));
    beeAbdomen = mult(beeAbdomen, scale(1, 1, 1.5));
    this.m_sphere.draw(this.graphicsState, beeAbdomen, BEE_ABDOMEN_TEXTURE);

    var beeLegLeftForward = mult(bee, translate(0.75, -0.5, 0.75));
    this.beeLeg(beeLegLeftForward);
    var beeLegLeftCenter = mult(bee, translate(0.75, -0.5, 0));
    this.beeLeg(beeLegLeftCenter);
    var beeLegLeftRear = mult(bee, translate(0.75, -0.5, -0.75));
    this.beeLeg(beeLegLeftRear);
    var beeWingLeft = mult(bee, translate(0.75, 0.75, 0));
    this.beeWing(beeWingLeft);

    // Flip orientation to generate the right side
    var beeRight = mult(bee, rotate(180, 0, 1, 0));
    var beeLegRightForward = mult(beeRight, translate(0.75, -0.5, 0.75));
    this.beeLeg(beeLegRightForward);
    var beeLegRightCenter = mult(beeRight, translate(0.75, -0.5, 0));
    this.beeLeg(beeLegRightCenter);
    var beeLegRightRear = mult(beeRight, translate(0.75, -0.5, -0.75));
    this.beeLeg(beeLegRightRear);
    var beeWingRight = mult(beeRight, translate(0.75, 0.75, 0));
    this.beeWing(beeWingRight);

    return origin;
};

/**
 * Draws a bee leg that moves around its origin.
 * @param model_transform Current matrix
 * @returns {*} Matrix at leg root
 */
Animation.prototype.beeLeg = function (model_transform) {
    var LEG_LENGTH = 1.5;
    var LEG_WIDTH = 0.2;
    var INITIAL_ANGLE = -60;
    var SWAY_PERIOD = 2000; // milliseconds
    var MAX_SWAY = 30; // degrees
    var BEE_BODY = new Material(getColorVec(10, 10, 10, 255), 1, 1, 1, 255);

    // Draw "thigh"
    model_transform = mult(model_transform, rotate(INITIAL_ANGLE, 0, 0, 1));
    model_transform = this.periodicPivot(model_transform, SWAY_PERIOD, MAX_SWAY);
    var origin = model_transform;
    model_transform = mult(model_transform, translate(LEG_LENGTH / 2, 0, 0));
    model_transform = mult(model_transform, scale(LEG_LENGTH, LEG_WIDTH, LEG_WIDTH));
    this.m_cube.draw(this.graphicsState, model_transform, BEE_BODY);

    // Draw "femur"
    var legEnd = mult(origin, translate(LEG_LENGTH, 0, 0));
    model_transform = mult(legEnd, rotate(INITIAL_ANGLE * 1.1, 0, 0, 1));
    model_transform = this.periodicPivot(model_transform, SWAY_PERIOD, MAX_SWAY);
    var origin = model_transform;
    model_transform = mult(model_transform, translate(LEG_LENGTH / 2, 0, 0));
    model_transform = mult(model_transform, scale(LEG_LENGTH, LEG_WIDTH, LEG_WIDTH));
    this.m_cube.draw(this.graphicsState, model_transform, BEE_BODY);

    return origin;
};

/**
 * Draws a flapping bee wing.
 * @param model_transform Current matrix
 * @returns {*} Matrix at wing root
 */
Animation.prototype.beeWing = function (model_transform) {
    var WING_LENGTH = 2;
    var WING_WIDTH = 1;
    var WING_THICKNESS = 0.2;
    var INITIAL_ANGLE = 60;
    var SWAY_PERIOD = 1000; // milliseconds
    var MAX_SWAY = 30; // degrees
    var WING_TEXTURE = new Material(getColorVec(255, 255, 255, 100), 1, 1, 1, 255);

    model_transform = mult(model_transform, rotate(INITIAL_ANGLE, 0, 0, 1));
    model_transform = this.periodicPivot(model_transform, SWAY_PERIOD, MAX_SWAY);
    var origin = model_transform;
    model_transform = mult(model_transform, translate(WING_LENGTH / 2, 0, 0));
    model_transform = mult(model_transform, scale(WING_LENGTH, WING_THICKNESS, WING_WIDTH));
    this.m_sphere.draw(this.graphicsState, model_transform, WING_TEXTURE);

    return origin;
};

/**
 * Draws sample objects.
 * @param model_transform Current matrix
 * @returns Transformed matrix
 */
Animation.prototype.sample = function (model_transform) {
    var purplePlastic = new Material(vec4(.9, .5, .9, 1), 1, 1, 1, 40);

    model_transform = mult(model_transform, translate(0, 10, -15));		    // Position the next shape by post-multiplying another matrix onto the current matrix product
    this.m_cube.draw(this.graphicsState, model_transform, purplePlastic);	// Draw a cube, passing in the current matrices
    CURRENT_BASIS_IS_WORTH_SHOWING(this, model_transform);					// How to draw a set of axes, conditionally displayed - cycle through by pressing p and m

    model_transform = mult(model_transform, translate(0, -2, 0));
    this.m_fan.draw(this.graphicsState, model_transform, purplePlastic);	// Cone
    CURRENT_BASIS_IS_WORTH_SHOWING(this, model_transform);

    model_transform = mult(model_transform, translate(0, -4, 0));
    this.m_cylinder.draw(this.graphicsState, model_transform, purplePlastic);	// Tube
    CURRENT_BASIS_IS_WORTH_SHOWING(this, model_transform);


    model_transform = mult(model_transform, translate(0, -3, 0));										// Example Translate
    model_transform = mult(model_transform, rotate(this.graphicsState.animation_time / 20, 0, 1, 0));	// Example Rotate
    model_transform = mult(model_transform, scale(5, 1, 5));											// Example Scale
    this.m_sphere.draw(this.graphicsState, model_transform, purplePlastic);			// Sphere

    model_transform = mult(model_transform, translate(0, -2, 0));
    this.m_strip.draw(this.graphicsState, model_transform, purplePlastic);			// Rectangle
    CURRENT_BASIS_IS_WORTH_SHOWING(this, model_transform);

    return model_transform;
};

/**
 * Draws a snowman
 * @param model_transform Current matrix
 * @returns Transformed matrix
 */
Animation.prototype.snowman = function (model_transform) {
    var greyPlastic = new Material(vec4(.5, .5, .5, 1), 1, 1, .5, 20);

    // Nose
    model_transform = mult(model_transform, rotate(this.graphicsState.animation_time / 20, 0, 1, 0));
    this.m_sphere.draw(this.graphicsState, model_transform, greyPlastic);

    // Upper sphere
    model_transform = mult(model_transform, translate(0, 0, 2));
    model_transform = mult(model_transform, scale(.3, .3, 1));
    this.m_fan.draw(this.graphicsState, model_transform, greyPlastic);
    model_transform = mult(model_transform, scale(1 / .3, 1 / .3, 1 / 1));
    model_transform = mult(model_transform, translate(0, 0, -2));

    // Center sphere
    model_transform = mult(model_transform, translate(0, -3, 0));
    model_transform = mult(model_transform, scale(2, 2, 2));
    this.m_sphere.draw(this.graphicsState, model_transform, greyPlastic);

    // Right arm
    model_transform = mult(model_transform, rotate(90, 0, 1, 0));
    model_transform = mult(model_transform, translate(0, 0, 2));
    model_transform = mult(model_transform, scale(.1, .1, 2))
    this.m_cylinder.draw(this.graphicsState, model_transform, greyPlastic);
    model_transform = mult(model_transform, scale(1 / .1, 1 / .1, 1 / 2))
    model_transform = mult(model_transform, translate(0, 0, -2));
    model_transform = mult(model_transform, rotate(-90, 0, 1, 0));

    // Left arm
    model_transform = mult(model_transform, rotate(-90, 0, 1, 0));
    model_transform = mult(model_transform, translate(0, 0, 2));
    model_transform = mult(model_transform, scale(.1, .1, 2))
    this.m_cylinder.draw(this.graphicsState, model_transform, greyPlastic);
    model_transform = mult(model_transform, scale(1 / .1, 1 / .1, 1 / 2))
    model_transform = mult(model_transform, translate(0, 0, -2));
    model_transform = mult(model_transform, rotate(90, 0, 1, 0));

    // Base sphere
    model_transform = mult(model_transform, translate(0, -3, 0));
    model_transform = mult(model_transform, scale(2, 2, 2))
    this.m_sphere.draw(this.graphicsState, model_transform, greyPlastic);

    return model_transform;
};

Animation.prototype.update_strings = function (debug_screen_object)		// Strings this particular class contributes to the UI
{
    debug_screen_object.string_map["time"] = "Animation Time: " + this.graphicsState.animation_time / 1000 + "s";
    debug_screen_object.string_map["basis"] = "Showing basis: " + this.m_axis.basis_selection;
    debug_screen_object.string_map["animate"] = "Animation " + (animate ? "on" : "off");
    debug_screen_object.string_map["thrust"] = "Thrust: " + thrust;
};
