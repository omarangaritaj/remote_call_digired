#!/bin/bash

echo "🔍 GPIO Debug Script for Raspberry Pi"
echo "====================================="

echo ""
echo "🖥️  System Information:"
echo "----------------------"
if [ -f /proc/device-tree/model ]; then
    echo "Device Model: $(cat /proc/device-tree/model)"
else
    echo "❌ Device model not found"
fi

echo "Architecture: $(uname -m)"
echo "Kernel: $(uname -r)"

echo ""
echo "📁 GPIO Files Check:"
echo "--------------------"
echo "GPIO export exists: $([ -f /sys/class/gpio/export ] && echo "✅ YES" || echo "❌ NO")"
echo "GPIO memory exists: $([ -c /dev/gpiomem ] && echo "✅ YES" || echo "❌ NO")"
echo "Memory device exists: $([ -c /dev/mem ] && echo "✅ YES" || echo "❌ NO")"

if [ -f /sys/class/gpio/export ]; then
    echo "GPIO export permissions: $(ls -la /sys/class/gpio/export)"
fi

if [ -c /dev/gpiomem ]; then
    echo "GPIO memory permissions: $(ls -la /dev/gpiomem)"
fi

echo ""
echo "👥 User and Groups:"
echo "------------------"
echo "Current user: $(whoami)"
echo "User groups: $(groups)"
echo "GPIO group exists: $(getent group gpio > /dev/null && echo "✅ YES" || echo "❌ NO")"
if getent group gpio > /dev/null; then
    echo "GPIO group members: $(getent group gpio | cut -d: -f4)"
fi

echo ""
echo "🐳 Docker Information:"
echo "---------------------"
if command -v docker &> /dev/null; then
    echo "Docker version: $(docker --version)"
    echo "Docker running: $(systemctl is-active docker)"
    echo "User in docker group: $(groups | grep -q docker && echo "✅ YES" || echo "❌ NO")"
else
    echo "❌ Docker not installed"
fi

echo ""
echo "🔧 GPIO Module Status:"
echo "----------------------"
lsmod | grep gpio || echo "❌ No GPIO modules loaded"

echo ""
echo "📊 Container GPIO Test:"
echo "----------------------"
if [ -f /.dockerenv ]; then
    echo "Running inside container: ✅ YES"
    echo "Container has privileged access: $([ -w /dev/mem ] && echo "✅ YES" || echo "❌ NO")"
    echo "Container /sys/class/gpio: $([ -d /sys/class/gpio ] && echo "✅ EXISTS" || echo "❌ MISSING")"
    echo "Container /dev/gpiomem: $([ -c /dev/gpiomem ] && echo "✅ EXISTS" || echo "❌ MISSING")"
else
    echo "Running on host: ✅ YES"
fi

echo ""
echo "🚀 Recommendations:"
echo "------------------"
if [ ! -f /proc/device-tree/model ] || ! grep -q "Raspberry Pi" /proc/device-tree/model; then
    echo "⚠️  This doesn't appear to be a Raspberry Pi"
    echo "   → GPIO functionality will run in simulation mode"
elif [ ! -c /dev/gpiomem ]; then
    echo "❌ GPIO memory device missing"
    echo "   → Run: sudo chmod 666 /dev/gpiomem"
elif [ ! -f /sys/class/gpio/export ]; then
    echo "❌ GPIO export missing"
    echo "   → Check if GPIO is enabled in raspi-config"
elif ! groups | grep -q gpio; then
    echo "⚠️  User not in gpio group"
    echo "   → Run: sudo usermod -a -G gpio $USER"
    echo "   → Then logout/login or reboot"
else
    echo "✅ GPIO should work correctly!"
fi

echo ""
echo "📱 Test Commands:"
echo "----------------"
echo "Test simulation mode:"
echo "  curl -X POST http://localhost:3000/test/switch/0"
echo ""
echo "Check application status:"
echo "  curl http://localhost:3000/status"
