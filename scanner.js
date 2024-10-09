const video = document.getElementById('video');
        const resultElement = document.getElementById('result');
        const currentTimeElement = document.getElementById('current-time');
        const messageElement = document.getElementById('message');
        const manualForm = document.getElementById('manual-form');
        const manualQRInput = document.getElementById('manual-qr');

        let lastScanTime = 0;
        const scanCooldown = 3000;
        const messageDisplayTime = 5000;
        let isScanning = false;
        let scannedQRs = new Set();

        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(stream => {
                video.srcObject = stream;
                video.setAttribute('playsinline', true);
                video.play();
                requestAnimationFrame(scanQRCode);
            })
            .catch(err => console.error('Error accessing camera:', err));

     
        function scanQRCode() {
            const now = Date.now();
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = video.videoHeight;
                canvas.width = video.videoWidth;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

                const code = jsQR(imageData.data, canvas.width, canvas.height);
                if (code && !isScanning && (now - lastScanTime > scanCooldown)) {
                    handleQRCodeScan(code.data);
                } else if (!code) {
                    resultElement.textContent = 'No QR code detected.';
                }
            }
            requestAnimationFrame(scanQRCode);
        }

      
        function handleQRCodeScan(qrCodeData) {
            const now = Date.now();

            if (!scannedQRs.has(qrCodeData)) {
                isScanning = true;
                lastScanTime = now; 
                scannedQRs.add(qrCodeData);

                logAttendance(qrCodeData).then(response => {
                    resultElement.textContent = response.message;
                    if (response.action === 'check-in') {
                        messageElement.textContent = `Good morning, ${response.name}`;
                    } else if (response.action === 'check-out') {
                        messageElement.textContent = `Good work today, ${response.name}`;
                    }

                    setTimeout(() => {
                        messageElement.textContent = '';
                    }, messageDisplayTime);

                    setTimeout(() => {
                        scannedQRs.delete(qrCodeData);
                    }, 60000); 
                }).catch(error => {
                    resultElement.textContent = 'Error logging attendance';
                    console.error('Error:', error);
                });

                setTimeout(() => {
                    isScanning = false;
                }, scanCooldown);
            } else {
                resultElement.textContent = 'Please wait before scanning again.';
            }
        }

   
        manualForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const manualQRCode = manualQRInput.value.trim();
            if (manualQRCode) {
                handleQRCodeScan(manualQRCode);
            }
            manualQRInput.value = '';
        });

        function updateTime() {
            const now = new Date();
            let hours = now.getHours();
            const minutes = now.getMinutes();
            const seconds = now.getSeconds();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12; 
            const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${ampm}`;
            currentTimeElement.textContent = `Current Time: ${formattedTime}`;
        }

        function logAttendance(qrCodeData) {
            return fetch(`log_attendance.php?qrCodeData=${encodeURIComponent(qrCodeData)}`)
                .then(response => response.json())
                .then(data => {
                    return fetchEmployeeName(qrCodeData).then(name => ({
                        ...data,
                        name: name
                    }));
                })
                .catch(error => {
                    console.error('Error logging attendance:', error);
                    return { status: 'error', message: 'Failed to log attendance' };
                });
        }

        function fetchEmployeeName(qrCodeData) {
            return fetch(`fetch_employee.php?qrCodeData=${encodeURIComponent(qrCodeData)}`)
                .then(response => response.json())
                .then(data => data.name || 'Unknown Employee')
                .catch(error => {
                    console.error('Error fetching employee name:', error);
                    return 'Unknown Employee';
                });
        }

        setInterval(updateTime, 1000);