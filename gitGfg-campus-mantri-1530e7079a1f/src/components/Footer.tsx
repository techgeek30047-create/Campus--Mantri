import React from 'react';
import { Code, Heart, Mail, Phone } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white py-8 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
          {/* Brand Section (logo only) */}
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <Code className="h-5 w-5 text-green-400" aria-hidden="true" />
          </div>
          
          {/* Contact Us Section */}
          <div className="lg:col-span-2">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Mail className="h-5 w-5 text-green-400 mr-2" />
              Contact Us
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {/* Email */}
              <div className="flex items-center space-x-2 text-gray-300">
                <Mail className="h-4 w-4 text-green-400" />
                <a
                  href="mailto:campus@geeksforgeeks.org"
                  className="hover:text-green-400 transition-colors"
                >
                  campus@geeksforgeeks.org
                </a>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom Section */}
        <div className="pt-6 border-t border-gray-800">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 text-gray-300 mb-4 md:mb-0">
              <span>Created with</span>
              <Heart className="h-4 w-4 text-red-400" />
              <span>by</span>
              <span className="font-semibold text-orange-400">GeeksforGeeks</span>
            </div>

            <div className="text-center md:text-right text-sm text-gray-400">
              <p>© 2025 GeeksforGeeks. All rights reserved.</p>
              <p className="mt-1">Developed by GeeksforGeeks Community Team</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;