// Handle payment
document.getElementById("proceedToPay").addEventListener("click", async function() {
    const amount = document.getElementById("donationAmount").value;
    const campaign = campaigns[currentCampaignIndex];
    
    if (!amount || isNaN(amount)) {
        document.getElementById("paymentStatus").innerHTML = "Please enter a valid amount";
        return;
    }
    
    if (amount < 1) {
        document.getElementById("paymentStatus").innerHTML = "Minimum donation is ₹1";
        return;
    }
    
    try {
        // Create order on the server
        const response = await fetch('/create-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: amount * 100, // Convert to paise
                currency: "INR",
                receipt: "donation_" + Date.now(),
                notes: {
                    campaign: campaign.name,
                    donor: "User"
                }
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to create order');
        }
        
        const order = await response.json();
        
        const options = {
            key: "rzp_test_ekuUcHA0UOfU6z",
            amount: order.amount,
            currency: order.currency,
            name: "Alumnexus",
            description: `Donation to ${campaign.name}`,
            image: "https://example.com/your_logo.jpg",
            order_id: order.id,
            modal: {
                ondismiss: function() {
                    document.getElementById("paymentStatus").innerHTML = `
                        <div class="payment-cancelled">
                            <p>Payment was cancelled</p>
                            <button onclick="retryPayment()" class="retry-btn">Retry Payment</button>
                        </div>
                    `;
                }
            },
            handler: async function(response) {
                try {
                    // Send payment data to backend
                    const saveResponse = await fetch('/payment-success', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            campaign: campaign.name,
                            amount: amount * 100, // in paise
                            transaction_id: response.razorpay_payment_id
                        })
                    });
                    
                    if (!saveResponse.ok) throw new Error('Failed to save donation');
                    
                    // Update UI
                    campaigns[currentCampaignIndex].raised += parseInt(amount);
                    updateCampaigns();
                    
                    document.getElementById("successMessage").innerHTML = `
                        Payment Successful!<br><br>
                        Thank you for your donation of ₹${amount} to ${campaign.name}!<br>
                        Transaction ID: ${response.razorpay_payment_id}
                    `;
                    modals.success.style.display = "block";
                    loadDonationHistory(); // Refresh history
                } catch (error) {
                    console.error("Payment processing error:", error);
                    document.getElementById("successMessage").innerHTML = `
                        Payment Successful!<br><br>
                        Thank you for your donation of ₹${amount} to ${campaign.name}!<br>
                        Transaction ID: ${response.razorpay_payment_id}<br><br>
                        <div class="warning">
                            Note: There was an issue saving your donation record. Please contact support with transaction ID.
                        </div>
                    `;
                    modals.success.style.display = "block";
                }
            },
            prefill: {
                name: "Ram Kumar",
                email: "john.doe@example.com",
                contact: "9876543210"
            },
            notes: {
                campaign: campaign.name
            },
            theme: {
                color: "#3399cc"
            }
        };
        
        const rzp = new Razorpay(options);

        rzp.on('payment.failed', function (response) {
            console.error("❌ Payment Failed", response);
            let errorMsg = response.error.description || "Unknown error";
            
            if (response.error.code === 'payment_cancelled') {
                errorMsg = "Payment was cancelled by user";
            }
            
            document.getElementById("paymentStatus").innerHTML = `
                <div class="payment-error">
                    <p>Payment failed ❌</p>
                    <p>Reason: ${errorMsg}</p>
                    <button onclick="retryPayment()" class="retry-btn">Retry Payment</button>
                    <button onclick="showAlternativeMethods()" class="alt-method-btn">Other Payment Methods</button>
                </div>
            `;
            modals.success.style.display = "none";
        });
        
        rzp.open();
        
    } catch (error) {
        console.error("Payment error:", error);
        document.getElementById("paymentStatus").innerHTML = `
            <div class="payment-error">
                <p>Payment processing failed. Please try again.</p>
                <button onclick="retryPayment()" class="retry-btn">Retry Payment</button>
                <button onclick="showAlternativeMethods()" class="alt-method-btn">Other Payment Methods</button>
            </div>
        `;
    }
});
