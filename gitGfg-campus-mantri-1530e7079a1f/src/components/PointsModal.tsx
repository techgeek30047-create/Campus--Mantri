import React from 'react';
import { X, Trophy, Star, Award, Gift, Clock, Target, Zap } from 'lucide-react';

interface PointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalPoints: number;
  approvedTasks: number;
  currentRank?: number;
}

const PointsModal: React.FC<PointsModalProps> = ({ 
  isOpen, 
  onClose, 
  totalPoints, 
  approvedTasks,
  currentRank 
}) => {
  if (!isOpen) return null;

  const getRewardTier = (points: number) => {
    if (points >= 1000) return 'platinum';
    if (points >= 500) return 'gold';
    if (points >= 250) return 'silver';
    if (points >= 100) return 'bronze';
    return 'starter';
  };

  const getNextTierPoints = (points: number) => {
    if (points < 100) return 100;
    if (points < 250) return 250;
    if (points < 500) return 500;
    if (points < 1000) return 1000;
    return null;
  };

  const currentTier = getRewardTier(totalPoints);
  const nextTierPoints = getNextTierPoints(totalPoints);

  const tierInfo = {
    starter: {
      name: 'Starter',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      icon: Target,
      rewards: ['Digital Recognition', 'Welcome Package'],
      description: 'Welcome to the Campus Mantri program! Complete your first tasks to earn points.'
    },
    bronze: {
      name: 'Bronze Achiever',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      icon: Award,
      rewards: ['Bronze Certificate', 'Exclusive Merchandise', 'Priority Support'],
      description: 'Great start! You\'re showing dedication to your campus community.'
    },
    silver: {
      name: 'Silver Champion',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      icon: Star,
      rewards: ['Silver Certificate', 'Premium Merchandise', 'Exclusive Webinar Access', 'LinkedIn Recommendation'],
      description: 'Excellent work! You\'re becoming a true campus leader.'
    },
    gold: {
      name: 'Gold Leader',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      icon: Trophy,
      rewards: ['Gold Certificate', 'Special Merchandise', 'Course Vouchers', 'Mentorship Program', 'Campus Event Hosting'],
      description: 'Outstanding performance! You\'re among the top campus mantris.'
    },
    platinum: {
      name: 'Platinum Elite',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      icon: Zap,
      rewards: ['Platinum Certificate', 'Exclusive Premium Package', 'Internship Opportunities', 'Industry Networking', 'Annual GFG Event Invitation'],
      description: 'Exceptional leadership! You\'re setting the standard for excellence.'
    }
  };

  const currentTierData = tierInfo[currentTier];
  const TierIcon = currentTierData.icon;

  const pointsBreakdown = [
    { task: 'Level 1 Tasks', points: 5, icon: Target },
    { task: 'Level 2 Tasks', points: 10, icon: Star },
    { task: 'Level 3 Tasks', points: 20, icon: Award },
    { task: 'Level 4 Tasks', points: 50, icon: Zap },
    { task: 'Level 5 Tasks', points: 100, icon: Trophy },
    { task: 'Level 6 Tasks', points: 200, icon: Clock }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-16 h-16 ${currentTierData.bgColor} rounded-full flex items-center justify-center`}>
                <TierIcon className={`h-8 w-8 ${currentTierData.color}`} />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Honor Points System</h2>
                <p className="text-green-100">Your Current Status: {currentTierData.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Current Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 text-center">
              <Trophy className="h-12 w-12 text-blue-600 mx-auto mb-3" />
              <h3 className="text-2xl font-bold text-gray-900">{totalPoints}</h3>
              <p className="text-blue-600 font-medium">Total Points</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 text-center">
              <Award className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-2xl font-bold text-gray-900">{approvedTasks}</h3>
              <p className="text-green-600 font-medium">Tasks Completed</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 text-center">
              <Star className="h-12 w-12 text-purple-600 mx-auto mb-3" />
              <h3 className="text-2xl font-bold text-gray-900">#{currentRank || 'N/A'}</h3>
              <p className="text-purple-600 font-medium">Current Rank</p>
            </div>
          </div>

          {/* Current Tier */}
          <div className={`${currentTierData.bgColor} rounded-xl p-6 border-2 border-dashed ${currentTierData.color.replace('text-', 'border-')}`}>
            <div className="flex items-center space-x-4 mb-4">
              <TierIcon className={`h-8 w-8 ${currentTierData.color}`} />
              <div>
                <h3 className={`text-xl font-bold ${currentTierData.color}`}>{currentTierData.name}</h3>
                <p className="text-gray-600">{currentTierData.description}</p>
              </div>
            </div>
            
            <div className="mb-4">
              <h4 className="font-semibold text-gray-900 mb-2">Your Current Tier Benefits:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {currentTierData.rewards.map((reward, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Gift className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-gray-700">{reward}</span>
                  </div>
                ))}
              </div>
            </div>

            {nextTierPoints && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Progress to Next Tier</span>
                  <span className="text-sm text-gray-600">{totalPoints}/{nextTierPoints} points</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((totalPoints / nextTierPoints) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {nextTierPoints - totalPoints} points needed for next tier
                </p>
              </div>
            )}
          </div>

          {/* Points Breakdown */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Trophy className="h-6 w-6 text-blue-600 mr-2" />
              Campus Mantri Task Points System
            </h3>
            
            <div className="bg-white rounded-lg p-4 mb-4 border border-blue-200">
              <div className="text-center">
                <h4 className="text-lg font-bold text-blue-900 mb-2">🎯 Level-Based Point System</h4>
                <p className="text-blue-700 font-medium">Max Points: 300 per task cycle</p>
                <p className="text-sm text-blue-600 mt-1">💡 Complete tasks, earn points & excel as a Campus Mantri!</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pointsBreakdown.map((item, index) => {
                const ItemIcon = item.icon;
                const levelColors = [
                  'bg-green-100 border-green-300 text-green-800',
                  'bg-blue-100 border-blue-300 text-blue-800', 
                  'bg-purple-100 border-purple-300 text-purple-800',
                  'bg-orange-100 border-orange-300 text-orange-800',
                  'bg-red-100 border-red-300 text-red-800',
                  'bg-yellow-100 border-yellow-300 text-yellow-800'
                ];
                return (
                  <div key={index} className={`flex items-center justify-between p-4 rounded-lg border-2 ${levelColors[index]}`}>
                    <div className="flex items-center space-x-3">
                      <ItemIcon className="h-6 w-6" />
                      <div>
                        <span className="font-semibold text-sm">{item.task}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-lg">{item.points}</span>
                      <span className="text-sm ml-1">pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-6 bg-white rounded-lg p-4 border border-blue-200">
              <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                <Star className="h-5 w-5 text-yellow-500 mr-2" />
                Bonus Points System
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                  <span className="text-green-700">⏰ Timely Completion Bonus</span>
                  <span className="font-bold text-green-600">+5-15 pts</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200">
                  <span className="text-blue-700">🏆 Quality Excellence Bonus</span>
                  <span className="font-bold text-blue-600">+10-20 pts</span>
                </div>
              </div>
            </div>
          </div>

          {/* All Tiers Overview */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Trophy className="h-6 w-6 text-yellow-600 mr-2" />
              All Achievement Tiers
            </h3>
            <div className="space-y-4">
              {Object.entries(tierInfo).map(([tier, data]) => {
                const TierIconComponent = data.icon;
                const isCurrentTier = tier === currentTier;
                const isUnlocked = totalPoints >= (tier === 'starter' ? 0 : tier === 'bronze' ? 100 : tier === 'silver' ? 250 : tier === 'gold' ? 500 : 1000);
                
                return (
                  <div 
                    key={tier} 
                    className={`p-4 rounded-lg border-2 ${
                      isCurrentTier 
                        ? 'border-green-500 bg-green-50' 
                        : isUnlocked 
                          ? 'border-gray-300 bg-gray-50' 
                          : 'border-gray-200 bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <TierIconComponent className={`h-6 w-6 ${data.color}`} />
                        <div>
                          <h4 className={`font-bold ${isCurrentTier ? 'text-green-700' : data.color}`}>
                            {data.name}
                            {isCurrentTier && <span className="ml-2 text-sm bg-green-200 text-green-800 px-2 py-1 rounded-full">Current</span>}
                          </h4>
                          <p className="text-sm text-gray-600">{data.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-700">
                          {tier === 'starter' ? '0+' : tier === 'bronze' ? '100+' : tier === 'silver' ? '250+' : tier === 'gold' ? '500+' : '1000+'} points
                        </p>
                        {isUnlocked ? (
                          <span className="text-xs text-green-600 font-medium">✓ Unlocked</span>
                        ) : (
                          <span className="text-xs text-gray-500">🔒 Locked</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Special Notes */}
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
            <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center">
              <Gift className="h-6 w-6 text-blue-600 mr-2" />
              Monthly Reward System
            </h3>
            <div className="space-y-2 text-sm text-blue-800">
              <p>• <strong>Monthly Recognition:</strong> Top 10 performers receive tier-based rewards each month</p>
              <p>• <strong>Special Achievements:</strong> Top 3 performers each month get additional recognition</p>
              <p>• <strong>Exclusive Events:</strong> High-tier members get invited to special GeeksforGeeks events</p>
              <p>• <strong>Timely Completion:</strong> Submit tasks before deadline to earn bonus points</p>
              <p>• <strong>Quality Bonus:</strong> Exceptional submissions receive additional points from admin review</p>
              <p>• <strong>Monthly Surprises:</strong> Top performers receive exciting monthly rewards - stay tuned!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PointsModal;