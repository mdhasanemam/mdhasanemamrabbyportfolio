<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Collect form data
    $name = $_POST['Name'];
    $email = $_POST['email'];
    $message = $_POST['Message'];

    // Add your email address where you want to receive the messages
    $to = "hasanemamrabbi@gmail.com";
    $subject = "Message from Portfolio Website";

    // Compose the email message
    $body = "Name: $name\n";
    $body .= "Email: $email\n";
    $body .= "Message:\n$message";

    // Send the email
    if (mail($to, $subject, $body)) {
        echo "<script>alert('Thank you! Your message has been sent.');</script>";
    } else {
        echo "<script>alert('Oops! Something went wrong. Please try again later.');</script>";
    }
}
?>
