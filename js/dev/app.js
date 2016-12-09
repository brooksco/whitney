$(document).foundation();

// Firebase reference for users
var ref = new Firebase("https://whitney.firebaseio.com/users");
// Firebase reference for acronyms
var refAcronym = new Firebase("https://whitney.firebaseio.com/acronyms");

var schoolAcronyms = {};

// Load acronyms
refAcronym.on("value", function(snapshot) {
	// Clear current acronyms
	schoolAcronyms = {};

	console.log("Acronyms");
	console.log(snapshot.val());

	var data = snapshot.val();

	for (var key in data) {
		if (data.hasOwnProperty(key)) {

			var short = data[key]["short"].toUpperCase();
			var full = data[key]["full"];

			schoolAcronyms[short] = full;
		}
	}

	console.log(schoolAcronyms);

}, function (errorObject) {
	console.log("The read failed: " + errorObject.code);
});


// Add event listener for form
var form = document.getElementById("whitneyForm");

if (form.addEventListener) {
    form.addEventListener("submit", processForm, false);  // Modern browsers

} else if (form.attachEvent) {
    form.attachEvent('onsubmit', processForm);            // Old IE
}

// Draw the whitney w initially
drawW();

// Once the page has loaded...
$(document).ready(function() {
	// Prefil stuff for dev'ing
	// $("input[name='First name']").val("aa");
	// $("input[name='Last name']").val("bb");
	// $("input[name='Email']").val("c@c.com");
	// $("input[name='School/Organization/Other']").val("abc school");

	// Check if user is logged in
	var user = ref.getAuth();

	if (user != null) {
		$("#login").addClass("hide");
		$(".admin-only").removeClass("hide");
	}

	// Use enter as tab key where appropriate
	$("input").keypress(function(e) {
		if (e.which == 13) {
       		// $(this).next('input').focus();
       		$(this).parent().next("label").children("input").focus();
       		e.preventDefault();
       	}
       });

	// Setup typeahead on school input
	$("#schoolInput").typeahead({
		hint: false,
		// highlight: true,
		minLength: 1,
		autoselect: true
	},
	{
		name: "schools",
		source: substringMatcher(schools)
	});

	// Scroll school field to top when focused so there's room for suggestions below
	$("#schoolInput").on("focus", function() {
		$("html, body").animate({
			scrollTop: $("#schoolInput").offset().top - 40
		}, 500);
	});

	// On blur validate the email very loosely. Has to be outside of Foundation Abide because of issue with type=email inputs
	$("#emailInput").on("blur", function() {
		var email = $("#emailInput").val();

		if (emailValidator(email) == false) {
			$("#emailInput").addClass("is-invalid-input");
			$("#emailLabel").addClass("is-invalid-label");
		}
	});

	// On blur (focus out) go through and check for acronyms
	$("#schoolInput").on("blur", function() {
		var schoolInput = $("#schoolInput").val();
		schoolInput = schoolInput.toUpperCase();

		var index = uppercaseSchools.indexOf(schoolInput);

		// Go through and see if there are any partial matches
		var matched = false;
		var findMatches = substringMatcher(schools);
		var result = findMatches(schoolInput, function(strs) {
			// If there's only one match, store it because it's probably correct
			if (strs.length === 1) {
				matched = strs[0];
			}
		});
		
		// First check if it's just typed in different case, or it was already correct to begin with
		if (index != -1) {
			console.log("Different case or already correct");

			$("#schoolInput").val(schools[index]);
			$("#schoolInput").attr("value", schools[index]);

			// Otherwise check if it's an acronym
		} else if (schoolInput in schoolAcronyms) {
			console.log("Acronym");

			$("#schoolInput").val(schoolAcronyms[schoolInput]);
			$("#schoolInput").attr("value", schoolAcronyms[schoolInput]);

			// If we matched with a single suggested school, set it to that
		} else if (matched !== false) {

			$("#schoolInput").val(matched);
			$("#schoolInput").attr(matched);
		}

	});

	//
	// Admin
	//

	// Handle login
	$("#loginForm").on("submit", function(e) {
		e.preventDefault();

		var loginEmail = $("input[name='loginEmail']").val();
		var loginPassword = $("input[name='loginPassword']").val();

		ref.authWithPassword({
			email : loginEmail,
			password : loginPassword

		}, function (error, authData) {
			if (error) {
				console.log("Login Failed!", error);
				$("#loginError").show();

			} else {
				console.log("Authenticated successfully with payload:", authData);
				$("#loginError").hide();

				$("#login").addClass("hide");
				$(".admin-only").removeClass("hide");
				$("#loginModal").foundation("close");
			}
		});

	});

	// Handle logging out
	$("#logout").on("click", function() {
		console.log("Logged out");
		ref.unauth();

		$("#login").removeClass("hide");
		$(".admin-only").addClass("hide");
	});

	//
	// Passwords
	//

	// Handle reset password
	$("#resetPassword").on("click", function() {
		$("#resetModal").foundation("open");
	});

	// Handle sending reset
	$("#resetSubmit").on("click", function(e) {
		e.preventDefault();

		var resetEmail = $("#resetEmail").val();

		if (resetEmail != "") {
			ref.resetPassword({
				email: resetEmail

			}, function(error) {
				if (error) {
					switch (error.code) {
						case "INVALID_USER":
						console.log("The specified user account does not exist.");
						break;
						default:
						console.log("Error resetting password:", error);
					}

				} else {
					console.log("Password reset email sent successfully!");
					$("#resetModal").foundation("close");
				}
			});
		}

	});

	// Handle change password
	$("#changePassword").on("click", function() {
		$("#changeModal").foundation("open");
	});

	// Handle sending change password
	$("#changeSubmit").on("click", function(e) {
		e.preventDefault();

		var changeEmail = $("#changeEmail").val();
		var oldPassword = $("#oldPassword").val();
		var newPassword = $("#newPassword").val();

		ref.changePassword({
			email: changeEmail,
			oldPassword: oldPassword,
			newPassword: newPassword

		}, function(error) {
			if (error) {
				switch (error.code) {
					case "INVALID_PASSWORD":
					console.log("The specified user account password is incorrect.");
					break;
					case "INVALID_USER":
					console.log("The specified user account does not exist.");
					break;
					default:
					console.log("Error changing password:", error);
				}

			} else {
				console.log("User password changed successfully!");
				$("#successModal").foundation("open");

				setTimeout(function(){
					$("#successModal").foundation("close");
					window.scrollTo(0, 0);
					location.reload();
				}, 2000);

			}
		});
	});

	//
	// Student List
	//

	// Handle showing full student list
	$("#list").on("click", function() {

		$("#listTable tbody").empty();
		$("#exportAsterisk").hide();

		ref.once("value", function(snapshot) {
			var data = snapshot.val();

			for (var key in data) {

				if (data.hasOwnProperty(key)) {
					var time = data[key]["time"];
					var firstName = data[key]["firstName"];
					var lastName = data[key]["lastName"];
					var email = data[key]["email"];
					var school = data[key]["school"];
					var hearAbout = data[key]["hearAbout"];
					var grade = data[key]["grade"];
					var timesWhitney = data[key]["timesWhitney"];
					var timesStudio = data[key]["timesStudio"];

					var date = time.substr(0, time.indexOf(' '));

					$("#listTable tbody").prepend("<tr><td>" + time + "</td><td>" + firstName + "</td><td>" + lastName + "</td><td>" + email + "</td><td>" + school + "</td><td>" + hearAbout + "</td><td>" + grade + "</td><td>" + timesWhitney + "</td><td>" + timesStudio + "</td><td class='deleteUserTd'><button class='alert button small deleteUser' data-key='" + key + "'>Delete</button></td></tr>");

				}
			}
		});

		$("#listModal").foundation("open");

	});

	//
	// Device Logs
	//

	// Handle showing device logs, very similar to full student list
	$("#logs").on("click", function() {

		$("#logsTable tbody").empty();

		if (typeof(Storage) !== "undefined") {

			for (i = 0; i < localStorage.length; i++)   {
				// Get substring...
				var sub = localStorage.key(i).substring(0, 10);

				// If it's an openstudio entry...
				if (sub == "openstudio") {
					var entry = JSON.parse(localStorage.getItem(localStorage.key(i)));

					// Time, first name, last name, email, school, hear about whitney, grade, times been to whitney, times been to open studio
					$("#logsTable tbody").prepend("<tr><td>" + entry[0] + "</td><td>" + entry[1] + "</td><td>" + entry[2] + "</td><td>" + entry[3] + "</td><td>" + entry[4] + "</td><td>" + entry[5] + "</td><td>" + entry[6] + "</td><td>" + entry[7] + "</td><td>" + entry[8] + "</td></tr>");

				}
			}
		}

		$("#logsModal").foundation("open");
	});

	// Handle deleting logs
	$("#clearLogs").on("click", function() {

		if (confirm("Are you sure you want clear the logs?")) {
			$("#logsTable tbody").empty();

			if (typeof(Storage) !== "undefined") {
				var deleteArray = [];

				for (i = 0; i < localStorage.length; i++) {
					// Get substring...
					var sub = localStorage.key(i).substring(0, 10);

					// If it's an openstudio entry...
					if (sub == "openstudio") {
						// Add the item to be cleared
						deleteArray.push(localStorage.key(i));
					}
				}

				// Go through and delete everything that needs to be deleted. This has to come in a separate loop, because otherwise
				// Localstorage.length shrinks as you delete items, screwing up the for loop
				for (i = 0; i < deleteArray.length; i++) {
					localStorage.removeItem(deleteArray[i]);
				}

				deleteArray = [];
			}
		}

	});

	//
	// Delete Student Entries
	//

	// Handle deleting user
	$("body").on("click", ".deleteUser", function() {
		var user = $(this).data("key");

		if (confirm("Are you sure you want to delete this entry?")) {
			ref.child(user).set(null);
			$(this).parents("tr").remove();
		}
	});

	//
	// School Stats
	//

	// Handle showing stats
	$("#stats").on("click", function() {

		$("#statsTable tbody").empty();

		ref.orderByChild("time").on("value", function(snapshot) {
			var tally = {};
			var data = snapshot.val();

			for (var key in data) {
				if (data.hasOwnProperty(key)) {

					var time = data[key]["time"];
					var date = time.substr(0, time.indexOf(' '));

					// Check if the date is already in the tally
					if (date in tally) {
						tally[date] += 1;

						// If it isn't, start the count
					} else {
						tally[date] = 1;

					}
				}
			}

			for (var key in tally) {
				if (tally.hasOwnProperty(key)) {

					$("#statsTable tbody").prepend("<tr><td>" + key + "</td><td>" + tally[key] + "</td></tr>");
				}
			}

			$("#statsModal").foundation("open");

		}, function (errorObject) {
			console.log("The read failed: " + errorObject.code);
		});

	});

	//
	// Acronyms
	//

	// Handle acronyms
	$("#acronyms").on("click", function() {
		$("#acronymsTable tbody").empty();

		refAcronym.once("value", function(snapshot) {
			// refAcronym.orderByChild("short").on("value", function(snapshot) {
				var data = snapshot.val();

				for (var key in data) {

					if (data.hasOwnProperty(key)) {
						var short = data[key]["short"];
						var full = data[key]["full"];

						$("#acronymsTable tbody").append("<tr><td>" + short + "</td><td>" + full + "</td><td><button class='alert button small deleteAcronym' data-short='" + short + "'>Delete</button></td></tr>");

					}
				}

			});

		$("#acronymsModal").foundation("open");

	});

	// Handle deleting acronym
	$("body").on("click", ".deleteAcronym", function() {
		var acronym = $(this).data("short");

		if (confirm("Are you sure you want to delete this acronym?")) {
			refAcronym.child(acronym).set(null);
			$(this).parents("tr").remove();
		}

	});

	// Handle adding acronym
	$("#addAcronym").on("click", function(e) {
		var short = $("#short").val();
		var full = $("#full").val();

		if (short == '' || full == '') {
			console.log("Nope");

		} else {

			refAcronym.child(short).set({
				short: short,
				full: full
			})

			// Clear form
			$("#short").val("");
			$("#full").val("");

			$("#acronymsTable tbody").append("<tr><td>" + short + "</td><td>" + full + "</td><td><button class='alert button small deleteAcronym' data-short='" + short + "'>Delete</button></td></tr>");
		}
	});
}); // End ready


//
// Form Submission
//

// Process the form on submit
function processForm(e) {
	e.preventDefault();

	showLoader(true);

	var time = getFormattedDate();
	var firstName = $("input[name='First name']").val();
	var lastName = $("input[name='Last name']").val();
	var email = $("input[name='Email']").val();
	var school = $("input[name='School/Organization/Other']").val();

	var hearAbout = $("input[name='How did you hear about Open Studio for Teens?']:checked").val();
	var grade = $("input[name='Grade']:checked").val();
	var timesWhitney = $("input[name='How many times have you been to the Whitney?']:checked").val();
	// var timesStudio = $("input[name='How many times have you attended Open Studio?']:checked").val();
	// SWITCH for event
	var timesStudio = '';

	var zipcode = $("input[name='ZIP code']").val();
	var emailValid = emailValidator(email);

	// Validate
	if (firstName == '' || lastName == '' || email == '' || zipcode == '' || school == '' || hearAbout == undefined || grade == undefined || timesWhitney == undefined || timesStudio == undefined || !emailValid) {
		console.log("Validation failed");
		$("div[data-abide-error]").show();

		if (!emailValid) {
			$("#emailInput").addClass("is-invalid-input");
			$("#emailLabel").addClass("is-invalid-label");
		}

		showLoader(false);

	} else {
		// var userInfo = [time, firstName, lastName, email, school, hearAbout, grade, timesWhitney, timesStudio];
		// w/ ZIP code
		var userInfo = [time, firstName, lastName, email, zipcode, school, hearAbout, grade, timesWhitney, timesStudio];
		
		// If localstorage is available...
		if (typeof(Storage) !== "undefined") {
			// Store the entry here in case we're having internet issues
			localStorage.setItem("openstudio" + time, JSON.stringify(userInfo));
		}

		// w/ ZIP code
		ref.push({
			time: time,
			firstName: firstName,
			lastName: lastName,
			email: email,
			zipcode: zipcode,
			school: school,
			hearAbout: hearAbout,
			grade: grade,
			timesWhitney: timesWhitney,
			timesStudio: timesStudio
		});

		// Push answers to google sheets
		pushToGoogle(time);
	}
}

//
// Google Sheets
//

// Push the form data to Google Sheets
function pushToGoogle(time) {
	console.log(time);
	// var serializedData = $("#whitneyForm").serialize() + "&Timestamp=" + time;
	// SWITCH for event
	var serializedData = $("#whitneyForm").serialize() + "&Timestamp=" + time + "&How many times have you attended Open Studio?";

	$.ajax({
		// Special teen event // test ajax form
		// url: "https://script.google.com/macros/s/AKfycbzP-0Yap6_ATFVXKyEubucQRmiI0E8hdSRLl8bocpLassYXr5Iy/exec",
		url: "https://script.google.com/macros/s/AKfycbwn9UxQvWSfxuCj8wdP3WVgusPlWCfUYuSTKTOk40Brw3ceZiU/exec",
		type: "post",
		data: serializedData,
		statusCode: {
			0: function () {
				// Even though Safari coming back as a 405/0, the post to Google Sheets was successful.
				// Problem related to CORS, though it all actually works, and doesn't error in Chrome. So just ignore it.
				console.log("0");

				$("#thanksModal").foundation("open");
				showLoader(false);

				setTimeout(function(){
					$("#thanksModal").foundation("close");
					window.scrollTo(0, 0);
					location.reload();
				}, 2000);
			},
			200: function () {
				console.log("200");

				$("#thanksModal").foundation("open");
				showLoader(false);

				setTimeout(function(){
					$("#thanksModal").foundation("close");
					window.scrollTo(0, 0);
					location.reload();
				}, 2000);
			}
		}
	});

}

//
// Loading Behavior
//

// Show/hide submit button changes and other loading/submitting elements
function showLoader(bool) {
	if (bool == true) {
		$("#formSubmit").addClass("disabled");
		$(".loader").removeClass("hide");
		$("#formSubmit").attr("value", "");

	} else {
		$(".loader").addClass("hide");
		$("#formSubmit").removeClass("disabled");
		$("#formSubmit").attr("value", "Sign in");
	}
}

//
// Email Validation
//

// Very, very loose email validation
function emailValidator(email) {
	var re = /\S+@\S+\.\S+/;

	if (re.test(email)) {
		return true;

	} else {
		return false;
	}
}

//
// Date Formatting
//

// Return properly formatted date string
function getFormattedDate() {
	var date = new Date();

	var month = date.getMonth() + 1;
	var day = date.getDate();
	var hour = date.getHours();
	var min = date.getMinutes();
	var sec = date.getSeconds();

	month = (month < 10 ? "0" : "") + month;
	day = (day < 10 ? "0" : "") + day;
	hour = (hour < 10 ? "0" : "") + hour;
	min = (min < 10 ? "0" : "") + min;
	sec = (sec < 10 ? "0" : "") + sec;

	var str = date.getFullYear() + "-" + month + "-" + day + " " +  hour + ":" + min + ":" + sec;

	return str;
}

//
// Substring Matcher
//

// Match string portions
var substringMatcher = function(strs) {
	return function findMatches(q, cb) {
		var matches, substringRegex;

    // an array that will be populated with substring matches
    matches = [];

    // regex used to determine if a string contains the substring `q`
    substrRegex = new RegExp(q, 'i');

    // iterate through the pool of strings and for any string that
    // contains the substring `q`, add it to the `matches` array
    $.each(strs, function(i, str) {
    	if (substrRegex.test(str)) {
    		matches.push(str);
    	}
    });

    cb(matches);
};
};


