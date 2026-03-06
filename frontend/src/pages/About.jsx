import React from "react";
import { FiLock, FiShare2, FiEye, FiDownload, FiShield } from "react-icons/fi";

const About = () => {
  const stats = [
    { label: "Users", value: "10,000+" },
    { label: "Files Shared", value: "1M+" },
    { label: "Data Transferred", value: "100TB+" },
    { label: "Uptime", value: "99.9%" },
  ];

  const team = [
    {
      name: "John Doe",
      role: "Founder & CEO",
      image: "https://via.placeholder.com/150",
    },
    {
      name: "Jane Smith",
      role: "CTO",
      image: "https://via.placeholder.com/150",
    },
    {
      name: "Mike Johnson",
      role: "Lead Developer",
      image: "https://via.placeholder.com/150",
    },
    {
      name: "Sarah Williams",
      role: "Security Engineer",
      image: "https://via.placeholder.com/150",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <FiShield className="mx-auto h-16 w-16 text-primary-600 dark:text-primary-400 mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              About Secure File Transfer
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              We're on a mission to make secure file sharing accessible to
              everyone. Our platform combines end-to-end encryption with ease of
              use.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-2">
                  {stat.value}
                </p>
                <p className="text-gray-600 dark:text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Our Mission
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                We believe that privacy is a fundamental right. Our mission is
                to provide a secure platform where individuals and businesses
                can share files without worrying about unauthorized access.
              </p>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                With end-to-end encryption, two-factor authentication, and
                real-time monitoring, we ensure that your data remains yours
                alone.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                <FiLock className="h-8 w-8 text-primary-600 mb-2" />
                <h3 className="font-semibold mb-1">Encrypted</h3>
                <p className="text-sm text-gray-600">AES-256 + RSA-2048</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                <FiShare2 className="h-8 w-8 text-primary-600 mb-2" />
                <h3 className="font-semibold mb-1">Secure Sharing</h3>
                <p className="text-sm text-gray-600">Granular permissions</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                <FiEye className="h-8 w-8 text-primary-600 mb-2" />
                <h3 className="font-semibold mb-1">Real-time</h3>
                <p className="text-sm text-gray-600">Live monitoring</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                <FiDownload className="h-8 w-8 text-primary-600 mb-2" />
                <h3 className="font-semibold mb-1">Easy Access</h3>
                <p className="text-sm text-gray-600">Anywhere, anytime</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Meet Our Team
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <div key={index} className="text-center">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
                />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {member.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {member.role}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
