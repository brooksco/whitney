//
// Function for drawing the Whitney W
//

//
// Responsive W
//

// On resize draw new W  
window.onresize = function(event) {
	drawW();
};

// On scroll draw new W 
window.onscroll = function (e) {  
	drawW();
} 

function drawW() {
	// w canvas variables
	var canvas = document.getElementById("wCanvas");
	var height = 90;

	var rightElement = document.getElementById("signInTitle");

	var top  = window.pageYOffset || document.documentElement.scrollTop;
	var rect = rightElement.getBoundingClientRect();
	var right = rect.left;
	var width = right - 20;

	// Set to 2 for left alligned, 0 for centered and right probably or whatever looks good
	var offsetX = 2;
	var offsetY = 2;

	canvas.width = (width + 10);

	if (canvas.getContext) {
		var ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.lineWidth = 1;

		// If we're past the base of the w...
		if (top >= height + offsetY ) {
			// If we're within a range of the w...fade it out slowly...
			if (top <= (height + offsetY + 30)) {
				var val = (height + offsetY + 30) - top;
				ctx.globalAlpha = (val / 30);

				ctx.beginPath();
				ctx.moveTo(offsetX, offsetY);
				ctx.lineTo(width + offsetX, offsetY);
				ctx.stroke();
			}

			// Otherwise draw the w...
		} else {
			var cHeight = height - top;
			ctx.globalAlpha = 1;

			ctx.beginPath();
			ctx.moveTo(0, 0);

			// Left alligned w
			ctx.moveTo(offsetX, offsetY);
			ctx.lineTo(offsetX, cHeight + offsetY);
			ctx.lineTo((2 * width) / 4 + offsetX, offsetY);
			ctx.lineTo((2 * width) / 4 + offsetX, cHeight + offsetY);
			ctx.lineTo(width + offsetX, offsetY);

			// Center alligned w
			// ctx.lineTo(width / 4 + offsetX, cHeight + offsetY);
			// ctx.lineTo((2 * width) / 4 + offsetX, offsetY);
			// ctx.lineTo((3 * width) / 4 + offsetX, cHeight + offsetY);
			// ctx.lineTo(width + offsetX, offsetY);

			// Right alligned w
			// ctx.lineTo((2 * width) / 4 + offsetX, cHeight + offsetY);
			// ctx.lineTo((2 * width) / 4 + offsetX, offsetY);
			// ctx.lineTo(width + offsetX, cHeight + offsetY);
			// ctx.lineTo(width + offsetX, offsetY);

			ctx.stroke();
		}

	}
} // End drawW
