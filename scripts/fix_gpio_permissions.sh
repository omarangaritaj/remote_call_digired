#!/bin/bash

# GPIO Permissions Fix Script for Raspberry Pi
echo "🔧 Fixing GPIO permissions for Docker container..."

# Check if running on Raspberry Pi
if [ ! -f /proc/device-tree/model ] || ! grep -q "Raspberry Pi" /proc/device-tree/model; then
    echo "⚠️  This script should only be run on a Raspberry Pi"
    exit 1
fi

# Create gpio group if it doesn't exist
if ! getent group gpio > /dev/null 2>&1; then
    echo "Creating gpio group..."
    sudo groupadd gpio
fi

# Add current user to gpio group
echo "Adding user to gpio group..."
sudo usermod -a -G gpio $USER

# Set up udev rules for GPIO access
echo "Setting up udev rules..."
sudo tee /etc/udev/rules.d/99-gpio.rules > /dev/null << EOF
# GPIO permissions
KERNEL=="gpiomem", GROUP="gpio", MODE="0660"
KERNEL=="gpio*", GROUP="gpio", MODE="0660"
SUBSYSTEM=="gpio", GROUP="gpio", MODE="0660"
EOF

# Reload udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger

# Set immediate permissions
echo "Setting immediate permissions..."
sudo chgrp gpio /dev/gpiomem
sudo chmod g+rw /dev/gpiomem

# Enable SPI and I2C if needed
echo "Enabling SPI and I2C..."
sudo raspi-config nonint do_spi 0
sudo raspi-config nonint do_i2c 0

# Set permissions for memory access
sudo chmod 666 /dev/mem

echo "✅ GPIO permissions configured successfully!"
echo ""
echo "⚠️  Please restart your system for all changes to take effect:"
echo "    sudo reboot"
